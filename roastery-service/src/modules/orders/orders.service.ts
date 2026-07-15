import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constants';
import type {
  DrizzleDB,
  DrizzleDbOrTx,
} from '../../database/drizzle.constants';
import { nextCode } from '../../common/sequence.util';
import { addresses, customerProfiles } from '../customers/customers.schema';
import {
  districts,
  provinces,
  regencies,
  villages,
} from '../regions/regions.schema';
import { products } from '../catalog/catalog.schema';
import { beanVariants } from '../catalog/beans/beans.schema';
import { InventoryService } from '../inventory/inventory.service';
import { stockMovements } from '../inventory/inventory.schema';
import { PricingService } from '../pricing/pricing.service';
import { promoCodes } from '../pricing/pricing.schema';
import { ZonesService } from '../delivery/zones/zones.service';
import { PaymentsService } from '../payments/payments.service';
import { DispatchService } from '../delivery/dispatch/dispatch.service';
import { deliveries } from '../delivery/dispatch/dispatch.schema';
import {
  carts,
  cartItems,
  orderItems,
  orders,
  orderStatusEnum,
  orderStatusHistory,
} from './orders.schema';
import type { AddCartItemDto, UpdateCartItemDto } from './dto/cart-item.dto';
import type { CheckoutDto } from './dto/checkout.dto';
import type { UpdateShippingDto } from './dto/order-status.dto';

type OrderStatus =
  | 'created'
  | 'paid'
  | 'processing'
  | 'out_for_delivery'
  | 'ready_for_pickup'
  | 'delivered'
  | 'cancelled';

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: ['paid', 'processing', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['out_for_delivery', 'ready_for_pickup'],
  out_for_delivery: ['delivered'],
  ready_for_pickup: ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * Filter `status` query param — dukung satu nilai ATAU beberapa dipisah
 * koma (mis. `?status=created,paid`, dipakai dashboard CMS utk kartu
 * "order baru"). Validasi tiap nilai terhadap enum asli supaya nilai
 * ngaco tidak nyampe ke Postgres sbg cast enum mentah (raw 500).
 */
function parseStatusFilter(
  status: string | undefined,
  column: typeof orders.status,
): SQL | undefined {
  if (!status) return undefined;
  const values = status
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = new Set<string>(orderStatusEnum.enumValues);
  const invalid = values.filter((v) => !valid.has(v));
  if (invalid.length > 0) {
    throw new BadRequestException(`Status tidak valid: ${invalid.join(', ')}`);
  }
  const statuses = values as Array<OrderStatus>;
  return statuses.length === 1
    ? eq(column, statuses[0])
    : inArray(column, statuses);
}

function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly inventoryService: InventoryService,
    private readonly pricingService: PricingService,
    private readonly zonesService: ZonesService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    @Inject(forwardRef(() => DispatchService))
    private readonly dispatchService: DispatchService,
  ) {}

  private async getProfile(userId: string) {
    const profile = await this.db.query.customerProfiles.findFirst({
      where: eq(customerProfiles.userId, userId),
    });
    if (!profile) {
      throw new NotFoundException('Profil customer tidak ditemukan');
    }
    return profile;
  }

  private async getOrCreateCart(
    customerId: string,
    tx: DrizzleDbOrTx = this.db,
  ) {
    const existing = await tx.query.carts.findFirst({
      where: eq(carts.customerId, customerId),
    });
    if (existing) {
      return existing;
    }
    const [created] = await tx
      .insert(carts)
      .values({ customerId })
      .onConflictDoNothing({ target: carts.customerId })
      .returning();
    if (created) {
      return created;
    }
    const cart = await tx.query.carts.findFirst({
      where: eq(carts.customerId, customerId),
    });
    if (!cart) {
      throw new Error('Gagal membuat/mengambil keranjang');
    }
    return cart;
  }

  private async describeItem(item: {
    variantId: string | null;
    productId: string | null;
  }) {
    if (item.variantId) {
      const variant = await this.db.query.beanVariants.findFirst({
        where: eq(beanVariants.id, item.variantId),
      });
      if (!variant) throw new NotFoundException('Varian tidak ditemukan');
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, variant.productId),
      });
      return {
        productId: variant.productId,
        name: product?.name ?? '',
        grind: variant.grind,
        weightGrams: variant.weightGrams,
      };
    }
    const product = await this.db.query.products.findFirst({
      where: eq(products.id, item.productId!),
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');
    return {
      productId: product.id,
      name: product.name,
      grind: null,
      weightGrams: null,
    };
  }

  private async assembleCart(cartId: string, isWholesale: boolean) {
    const rows = await this.db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));
    let subtotal = 0;
    const items = await Promise.all(
      rows.map(async (row) => {
        const info = await this.describeItem(row);
        const resolved = await this.pricingService.resolvePrice({
          variantId: row.variantId ?? undefined,
          productId: row.productId ?? undefined,
          quantity: row.quantity,
          isWholesale,
        });
        const lineTotal = resolved.price * row.quantity;
        subtotal += lineTotal;
        return {
          id: row.id,
          productId: info.productId,
          variantId: row.variantId,
          name: info.name,
          quantity: row.quantity,
          unitPrice: resolved.price,
          lineTotal,
        };
      }),
    );
    return { id: cartId, items, subtotal };
  }

  async getCart(userId: string, isWholesale: boolean) {
    const profile = await this.getProfile(userId);
    const cart = await this.getOrCreateCart(profile.id);
    return { cart: await this.assembleCart(cart.id, isWholesale) };
  }

  async addCartItem(userId: string, dto: AddCartItemDto, isWholesale: boolean) {
    if (Boolean(dto.variantId) === Boolean(dto.productId)) {
      throw new BadRequestException(
        'Isi salah satu: variantId (biji) atau productId (equipment)',
      );
    }
    const profile = await this.getProfile(userId);

    if (dto.variantId) {
      const variant = await this.db.query.beanVariants.findFirst({
        where: eq(beanVariants.id, dto.variantId),
      });
      if (!variant || !variant.isActive) {
        throw new NotFoundException('Varian tidak ditemukan');
      }
    } else {
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, dto.productId!),
      });
      if (!product || !product.isActive) {
        throw new NotFoundException('Produk tidak ditemukan');
      }
    }

    const cart = await this.getOrCreateCart(profile.id);
    const existing = await this.db.query.cartItems.findFirst({
      where: dto.variantId
        ? and(
            eq(cartItems.cartId, cart.id),
            eq(cartItems.variantId, dto.variantId),
          )
        : and(
            eq(cartItems.cartId, cart.id),
            eq(cartItems.productId, dto.productId!),
          ),
    });
    const targetQuantity = (existing?.quantity ?? 0) + dto.quantity;

    const avail = await this.inventoryService.availability(
      dto.variantId,
      dto.productId,
    );
    if (avail.quantity < targetQuantity) {
      throw new ConflictException('Stok tidak cukup');
    }

    if (existing) {
      await this.db
        .update(cartItems)
        .set({ quantity: targetQuantity })
        .where(eq(cartItems.id, existing.id));
    } else {
      await this.db.insert(cartItems).values({
        cartId: cart.id,
        variantId: dto.variantId,
        productId: dto.productId,
        quantity: dto.quantity,
      });
    }
    return { cart: await this.assembleCart(cart.id, isWholesale) };
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
    isWholesale: boolean,
  ) {
    const profile = await this.getProfile(userId);
    const cart = await this.getOrCreateCart(profile.id);
    const item = await this.db.query.cartItems.findFirst({
      where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)),
    });
    if (!item) {
      throw new NotFoundException('Item keranjang tidak ditemukan');
    }
    const avail = await this.inventoryService.availability(
      item.variantId ?? undefined,
      item.productId ?? undefined,
    );
    if (avail.quantity < dto.quantity) {
      throw new ConflictException('Stok tidak cukup');
    }
    await this.db
      .update(cartItems)
      .set({ quantity: dto.quantity })
      .where(eq(cartItems.id, itemId));
    return { cart: await this.assembleCart(cart.id, isWholesale) };
  }

  async removeCartItem(userId: string, itemId: string, isWholesale: boolean) {
    const profile = await this.getProfile(userId);
    const cart = await this.getOrCreateCart(profile.id);
    const item = await this.db.query.cartItems.findFirst({
      where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)),
    });
    if (!item) {
      throw new NotFoundException('Item keranjang tidak ditemukan');
    }
    await this.db.delete(cartItems).where(eq(cartItems.id, itemId));
    return { cart: await this.assembleCart(cart.id, isWholesale) };
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const profile = await this.getProfile(userId);
    const isWholesale = profile.customerType === 'wholesale';

    if (dto.paymentMethod === 'cod' && dto.fulfillmentMethod !== 'delivery') {
      throw new BadRequestException(
        'COD hanya untuk pengiriman driver dalam zona',
      );
    }

    const orderId = randomUUID();

    return this.db.transaction(async (tx) => {
      const cart = await this.getOrCreateCart(profile.id, tx);
      const items = await tx
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, cart.id));
      if (items.length === 0) {
        throw new ConflictException('Keranjang kosong');
      }

      let deliveryAddress: Record<string, unknown> | null = null;
      let deliveryFee = 0;
      let shippingMethod: 'internal' | 'external' | null = null;
      let zoneId: string | null = null;

      if (dto.fulfillmentMethod === 'delivery') {
        if (!dto.addressId) {
          throw new BadRequestException(
            'addressId wajib diisi untuk pengiriman delivery',
          );
        }
        const [addressRow] = await tx
          .select({
            id: addresses.id,
            customerId: addresses.customerId,
            recipientName: addresses.recipientName,
            phone: addresses.phone,
            line1: addresses.line1,
            line2: addresses.line2,
            postalCode: addresses.postalCode,
            districtCode: addresses.districtCode,
            provinceName: provinces.name,
            regencyName: regencies.name,
            districtName: districts.name,
            villageName: villages.name,
          })
          .from(addresses)
          .innerJoin(provinces, eq(addresses.provinceCode, provinces.code))
          .innerJoin(regencies, eq(addresses.regencyCode, regencies.code))
          .innerJoin(districts, eq(addresses.districtCode, districts.code))
          .leftJoin(villages, eq(addresses.villageCode, villages.code))
          .where(eq(addresses.id, dto.addressId));
        if (!addressRow || addressRow.customerId !== profile.id) {
          throw new BadRequestException('Alamat tidak ditemukan');
        }
        deliveryAddress = {
          recipientName: addressRow.recipientName,
          phone: addressRow.phone,
          line1: addressRow.line1,
          line2: addressRow.line2,
          province: addressRow.provinceName,
          regency: addressRow.regencyName,
          district: addressRow.districtName,
          village: addressRow.villageName,
          postalCode: addressRow.postalCode,
        };

        const resolved = await this.zonesService.resolveByDistrictCode(
          addressRow.districtCode,
        );
        deliveryFee = resolved.fee;
        shippingMethod = resolved.shippingMethod;
        zoneId = resolved.zone.id;

        if (dto.paymentMethod === 'cod' && shippingMethod !== 'internal') {
          throw new BadRequestException(
            'COD hanya untuk pengiriman driver dalam zona',
          );
        }
      }

      let subtotal = 0;
      const itemsToInsert: (typeof orderItems.$inferInsert)[] = [];
      for (const item of items) {
        const info = await this.describeItem(item);
        const resolved = await this.pricingService.resolvePrice({
          variantId: item.variantId ?? undefined,
          productId: item.productId ?? undefined,
          quantity: item.quantity,
          isWholesale,
        });
        const lineTotal = resolved.price * item.quantity;
        subtotal += lineTotal;

        if (item.variantId) {
          await this.inventoryService.reserveBeanStock(
            item.variantId,
            item.quantity,
            orderId,
            tx,
          );
        } else {
          await this.inventoryService.reserveEquipmentUnits(
            item.productId!,
            item.quantity,
            orderId,
            tx,
          );
        }

        itemsToInsert.push({
          orderId,
          productId: info.productId,
          variantId: item.variantId,
          name: info.name,
          grind: info.grind,
          weightGrams: info.weightGrams,
          quantity: item.quantity,
          unitPrice: resolved.price,
          lineTotal,
        });
      }

      let discount = 0;
      if (dto.promoCode) {
        const promoResult = await this.pricingService.validatePromo(
          dto.promoCode,
          subtotal,
        );
        if (!promoResult.valid) {
          throw new UnprocessableEntityException(
            `Promo tidak valid: ${promoResult.reason}`,
          );
        }
        discount = promoResult.discount;
        await tx
          .update(promoCodes)
          .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
          .where(eq(promoCodes.code, dto.promoCode));
      }

      const total = subtotal - discount + deliveryFee;
      const paymentType = isWholesale ? 'invoice' : 'prepaid';
      const codAmount = dto.paymentMethod === 'cod' ? total : null;

      const orderNumber = await nextCode(tx, {
        prefix: 'ORD',
        scope: 'daily',
        width: 4,
        counter: 'order',
      });

      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        customerId: profile.id,
        status: 'created',
        paymentType,
        fulfillmentMethod: dto.fulfillmentMethod,
        shippingMethod,
        subtotal,
        discount,
        deliveryFee,
        total,
        promoCode: dto.promoCode,
        deliveryAddress,
        notes: dto.notes,
      });
      await tx.insert(orderItems).values(itemsToInsert);
      await tx
        .insert(orderStatusHistory)
        .values({ orderId, status: 'created', changedBy: userId });

      if (dto.paymentMethod === 'cod') {
        await this.paymentsService.createCodPayment(orderId, total, tx);
        await this.changeStatus(
          orderId,
          'processing',
          userId,
          'COD — bayar tunai ke driver',
          tx,
        );
      }

      if (
        dto.fulfillmentMethod === 'delivery' &&
        shippingMethod === 'internal'
      ) {
        await this.dispatchService.createForOrder(
          orderId,
          zoneId!,
          codAmount,
          tx,
        );
      }

      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

      const [finalOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));
      return { order: await this.assembleOrder(finalOrder, tx) };
    });
  }

  private async assembleOrder(
    order: typeof orders.$inferSelect,
    tx: DrizzleDbOrTx = this.db,
  ) {
    const [items, delivery] = await Promise.all([
      tx.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
      tx.query.deliveries.findFirst({
        where: eq(deliveries.orderId, order.id),
        columns: { codAmount: true },
      }),
    ]);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentType: order.paymentType,
      // paymentType enum cuma prepaid|invoice — COD tidak direpresentasikan
      // di sana sama sekali, satu-satunya sinyal COD ada di deliveries.cod_amount.
      codAmount: delivery?.codAmount ?? null,
      fulfillmentMethod: order.fulfillmentMethod,
      shippingMethod: order.shippingMethod,
      courierName: order.courierName,
      trackingNumber: order.trackingNumber,
      pickupCode: order.pickupCode,
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        name: i.name,
        grind: i.grind,
        weightGrams: i.weightGrams,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
      deliveryAddress: order.deliveryAddress,
      notes: order.notes,
      createdAt: order.createdAt,
    };
  }

  async getById(userId: string, orderId: string, isStaff: boolean) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }
    if (!isStaff) {
      const profile = await this.getProfile(userId);
      if (order.customerId !== profile.id) {
        throw new ForbiddenException('Bukan order Anda');
      }
    }
    return { order: await this.assembleOrder(order) };
  }

  async listMine(
    userId: string,
    status: string | undefined,
    page: number,
    limit: number,
  ) {
    const profile = await this.getProfile(userId);
    const conditions: SQL[] = [eq(orders.customerId, profile.id)];
    const statusCondition = parseStatusFilter(status, orders.status);
    if (statusCondition) conditions.push(statusCondition);
    const where = and(...conditions);
    const offset = (page - 1) * limit;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(orders)
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(where),
    ]);
    return {
      data: await Promise.all(rows.map((r) => this.assembleOrder(r))),
      total: totalRows[0]?.count ?? 0,
      page,
    };
  }

  async listAdmin(
    status: string | undefined,
    search: string | undefined,
    page: number,
    limit: number,
  ) {
    const conditions: SQL[] = [];
    const statusCondition = parseStatusFilter(status, orders.status);
    if (statusCondition) conditions.push(statusCondition);
    if (search)
      conditions.push(sql`${orders.orderNumber} ilike ${'%' + search + '%'}`);
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(orders)
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(where),
    ]);
    return {
      data: await Promise.all(rows.map((r) => this.assembleOrder(r))),
      total: totalRows[0]?.count ?? 0,
    };
  }

  /** Dipakai controller (staff) + Payments/Delivery via DI (webhook paid, delivered). */
  async changeStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string | null,
    note?: string,
    tx: DrizzleDbOrTx = this.db,
  ) {
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }
    const current = order.status;
    if (!ORDER_TRANSITIONS[current].includes(newStatus)) {
      throw new ConflictException(
        `Transisi status ${current} -> ${newStatus} tidak diizinkan`,
      );
    }

    const patch: Partial<typeof orders.$inferInsert> = {
      status: newStatus,
      updatedAt: new Date(),
    };
    if (newStatus === 'ready_for_pickup') {
      patch.pickupCode = generatePickupCode();
    }

    const [updated] = await tx
      .update(orders)
      .set(patch)
      .where(eq(orders.id, orderId))
      .returning();
    await tx
      .insert(orderStatusHistory)
      .values({ orderId, status: newStatus, changedBy, note });

    if (newStatus === 'delivered') {
      await this.settleInventory(orderId, tx, 'commit');
    } else if (newStatus === 'cancelled') {
      await this.settleInventory(orderId, tx, 'release');
    }

    return updated;
  }

  private async settleInventory(
    orderId: string,
    tx: DrizzleDbOrTx,
    action: 'commit' | 'release',
  ) {
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (item.variantId) {
        if (action === 'commit') {
          await this.inventoryService.commitBeanStock(
            item.variantId,
            item.quantity,
            orderId,
            tx,
          );
        } else {
          await this.inventoryService.releaseBeanStock(
            item.variantId,
            item.quantity,
            orderId,
            tx,
          );
        }
      }
    }
    const unitRows = await tx
      .select({ unitId: stockMovements.unitId })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.refOrderId, orderId),
          eq(stockMovements.reason, 'reserve'),
          isNotNull(stockMovements.unitId),
        ),
      );
    const unitIds = unitRows
      .map((r) => r.unitId)
      .filter((id): id is string => id !== null);
    if (unitIds.length > 0) {
      if (action === 'commit') {
        await this.inventoryService.commitEquipmentUnits(unitIds, orderId, tx);
      } else {
        await this.inventoryService.releaseEquipmentUnits(unitIds, orderId, tx);
      }
    }
  }

  async updateShipping(orderId: string, dto: UpdateShippingDto) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }
    if (order.shippingMethod !== 'external' || order.status !== 'processing') {
      throw new ConflictException(
        'Hanya order pengiriman eksternal berstatus processing yang bisa diinput resi',
      );
    }
    await this.db
      .update(orders)
      .set({ courierName: dto.courierName, trackingNumber: dto.trackingNumber })
      .where(eq(orders.id, orderId));
    const updated = await this.changeStatus(
      orderId,
      'out_for_delivery',
      null,
      'Resi diinput staff',
    );
    return { order: await this.assembleOrder(updated) };
  }
}
