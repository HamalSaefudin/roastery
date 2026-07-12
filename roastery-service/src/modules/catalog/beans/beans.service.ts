import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { products } from '../catalog.schema';
import { baseProductQuery, mapProductListItem } from '../catalog.query';
import { beanDetails, beanVariants } from './beans.schema';
import type { CreateBeanVariantDto } from './dto/bean-variant.dto';

interface ListBeansParams {
  originId?: string;
  process?: string;
  roastLevel?: string;
  search?: string;
  page: number;
  limit: number;
}

/** whole -> WB, selain itu di-uppercase apa adanya (konvensi §16). */
function grindCode(grind: string): string {
  return grind === 'whole' ? 'WB' : grind.toUpperCase();
}

@Injectable()
export class BeansService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listPublic(params: ListBeansParams) {
    const conditions: SQL[] = [
      eq(products.type, 'bean'),
      eq(products.isActive, true),
    ];
    if (params.originId) {
      conditions.push(eq(beanDetails.originId, params.originId));
    }
    if (params.process) {
      conditions.push(eq(beanDetails.process, params.process as 'washed'));
    }
    if (params.roastLevel) {
      conditions.push(eq(beanDetails.roastLevel, params.roastLevel as 'light'));
    }
    if (params.search) {
      conditions.push(ilike(products.name, `%${params.search}%`));
    }
    const where = and(...conditions);
    const offset = (params.page - 1) * params.limit;

    const [rows, totalRows] = await Promise.all([
      baseProductQuery(this.db)
        .innerJoin(beanDetails, eq(products.id, beanDetails.productId))
        .where(where)
        .limit(params.limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .innerJoin(beanDetails, eq(products.id, beanDetails.productId))
        .where(where),
    ]);

    return {
      data: rows.map((r) => mapProductListItem(r)),
      total: totalRows[0]?.count ?? 0,
      page: params.page,
    };
  }

  async createVariant(productId: string, dto: CreateBeanVariantDto) {
    const product = await this.db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (!product || product.type !== 'bean') {
      throw new NotFoundException('Produk biji kopi tidak ditemukan');
    }

    const sku = `${product.code}-${dto.weightGrams}-${grindCode(dto.grind)}`;
    const existing = await this.db.query.beanVariants.findFirst({
      where: eq(beanVariants.sku, sku),
    });
    if (existing) {
      throw new ConflictException('Varian dengan berat & giling ini sudah ada');
    }

    const [variant] = await this.db
      .insert(beanVariants)
      .values({
        productId,
        weightGrams: dto.weightGrams,
        grind: dto.grind,
        sku,
      })
      .returning();
    return variant;
  }
}
