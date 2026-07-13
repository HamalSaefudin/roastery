import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, lte } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constants';
import type { DrizzleDB } from '../../database/drizzle.constants';
import { beanVariants } from '../catalog/beans/beans.schema';
import { products } from '../catalog/catalog.schema';
import { prices, promoCodes, wholesaleTiers } from './pricing.schema';
import type { CreatePriceDto, UpdatePriceDto } from './dto/price.dto';
import type { CreateWholesaleTierDto } from './dto/wholesale-tier.dto';
import type { CreatePromoCodeDto } from './dto/promo-code.dto';

type PromoInvalidReason =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'usage_limit'
  | 'min_order';

interface ResolvePriceParams {
  variantId?: string;
  productId?: string;
  quantity: number;
  isWholesale: boolean;
}

@Injectable()
export class PricingService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async resolvePrice(params: ResolvePriceParams) {
    if (!params.variantId && !params.productId) {
      throw new BadRequestException('variantId atau productId wajib diisi');
    }

    const priceRow = await this.db.query.prices.findFirst({
      where: params.variantId
        ? eq(prices.variantId, params.variantId)
        : eq(prices.productId, params.productId!),
    });
    if (!priceRow) {
      throw new NotFoundException('Harga belum diset');
    }

    const base = { price: priceRow.price, currency: priceRow.currency };

    if (!params.isWholesale) {
      return { ...base, priceType: 'retail' as const, appliedTier: null };
    }

    const [tier] = await this.db
      .select()
      .from(wholesaleTiers)
      .where(
        and(
          eq(wholesaleTiers.isActive, true),
          lte(wholesaleTiers.minQuantity, params.quantity),
        ),
      )
      .orderBy(desc(wholesaleTiers.minQuantity))
      .limit(1);

    if (!tier) {
      return { ...base, priceType: 'retail' as const, appliedTier: null };
    }

    const wholesalePrice = Math.floor(
      (priceRow.price * (100 - tier.discountPercent)) / 100,
    );
    return {
      price: wholesalePrice,
      currency: priceRow.currency,
      priceType: 'wholesale' as const,
      appliedTier: {
        id: tier.id,
        name: tier.name,
        discountPercent: tier.discountPercent,
      },
    };
  }

  async validatePromo(code: string, subtotal: number) {
    const promo = await this.db.query.promoCodes.findFirst({
      where: eq(promoCodes.code, code),
    });
    const fail = (reason: PromoInvalidReason) => ({
      valid: false as const,
      reason,
    });

    if (!promo) {
      return fail('not_found');
    }
    if (!promo.isActive) {
      return fail('inactive');
    }
    const now = new Date();
    if (promo.startsAt && now < promo.startsAt) {
      return fail('not_started');
    }
    if (promo.endsAt && now > promo.endsAt) {
      return fail('expired');
    }
    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      return fail('usage_limit');
    }
    if (promo.minOrder !== null && subtotal < promo.minOrder) {
      return fail('min_order');
    }

    let discount: number;
    if (promo.type === 'percent') {
      discount = Math.floor((subtotal * promo.value) / 100);
      if (promo.maxDiscount !== null) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else {
      discount = Math.min(promo.value, subtotal);
    }

    return {
      valid: true as const,
      type: promo.type,
      value: promo.value,
      discount,
    };
  }

  async createPrice(dto: CreatePriceDto) {
    if (Boolean(dto.variantId) === Boolean(dto.productId)) {
      throw new BadRequestException(
        'Isi salah satu: variantId (biji) atau productId (equipment)',
      );
    }

    if (dto.variantId) {
      const variant = await this.db.query.beanVariants.findFirst({
        where: eq(beanVariants.id, dto.variantId),
      });
      if (!variant) {
        throw new NotFoundException('Varian tidak ditemukan');
      }
      const existing = await this.db.query.prices.findFirst({
        where: eq(prices.variantId, dto.variantId),
      });
      if (existing) {
        throw new ConflictException(
          'Harga untuk varian ini sudah ada, gunakan PATCH',
        );
      }
    } else {
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, dto.productId!),
      });
      if (!product) {
        throw new NotFoundException('Produk tidak ditemukan');
      }
      const existing = await this.db.query.prices.findFirst({
        where: eq(prices.productId, dto.productId!),
      });
      if (existing) {
        throw new ConflictException(
          'Harga untuk produk ini sudah ada, gunakan PATCH',
        );
      }
    }

    const [price] = await this.db
      .insert(prices)
      .values({
        variantId: dto.variantId,
        productId: dto.productId,
        price: dto.price,
      })
      .returning();
    return price;
  }

  async updatePrice(id: string, dto: UpdatePriceDto) {
    const existing = await this.db.query.prices.findFirst({
      where: eq(prices.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Harga tidak ditemukan');
    }
    const [price] = await this.db
      .update(prices)
      .set({ price: dto.price, updatedAt: new Date() })
      .where(eq(prices.id, id))
      .returning();
    return price;
  }

  async createWholesaleTier(dto: CreateWholesaleTierDto) {
    const [tier] = await this.db.insert(wholesaleTiers).values(dto).returning();
    return tier;
  }

  async removeWholesaleTier(id: string): Promise<void> {
    const existing = await this.db.query.wholesaleTiers.findFirst({
      where: eq(wholesaleTiers.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Tier tidak ditemukan');
    }
    await this.db.delete(wholesaleTiers).where(eq(wholesaleTiers.id, id));
  }

  async createPromoCode(dto: CreatePromoCodeDto) {
    if (dto.type === 'percent' && dto.value > 100) {
      throw new BadRequestException('value persen maksimal 100');
    }
    const existing = await this.db.query.promoCodes.findFirst({
      where: eq(promoCodes.code, dto.code),
    });
    if (existing) {
      throw new ConflictException('Kode promo sudah ada');
    }
    const [promo] = await this.db
      .insert(promoCodes)
      .values({
        code: dto.code,
        type: dto.type,
        value: dto.value,
        minOrder: dto.minOrder,
        maxDiscount: dto.maxDiscount,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        usageLimit: dto.usageLimit,
      })
      .returning();
    return promo;
  }

  listPromoCodes() {
    return this.db.select().from(promoCodes).orderBy(desc(promoCodes.startsAt));
  }

  /**
   * List semua harga + nama/SKU item (join manual per baris, bukan satu
   * query gabungan — `prices` XOR variant/product jadi butuh 2 kemungkinan
   * join; jumlah baris harga kecil (dikurasi staff), pola sama dgn
   * `describeItem` di OrdersService drpd LEFT JOIN products dua alias).
   */
  async listPrices() {
    const rows = await this.db
      .select()
      .from(prices)
      .orderBy(desc(prices.updatedAt));

    return Promise.all(
      rows.map(async (row) => {
        if (row.variantId) {
          const variant = await this.db.query.beanVariants.findFirst({
            where: eq(beanVariants.id, row.variantId),
          });
          const product = variant
            ? await this.db.query.products.findFirst({
                where: eq(products.id, variant.productId),
              })
            : null;
          return { ...row, itemSku: variant?.sku, itemName: product?.name };
        }
        if (row.productId) {
          const product = await this.db.query.products.findFirst({
            where: eq(products.id, row.productId),
          });
          return { ...row, itemSku: product?.code, itemName: product?.name };
        }
        return row;
      }),
    );
  }

  listWholesaleTiers() {
    return this.db
      .select()
      .from(wholesaleTiers)
      .orderBy(wholesaleTiers.minQuantity);
  }
}
