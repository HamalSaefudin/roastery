import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { products } from '../catalog.schema';
import { baseProductQuery, mapProductListItem } from '../catalog.query';
import { grinderDetails } from './grinders.schema';

interface ListGrindersParams {
  brandId?: string;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class GrindersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listPublic(params: ListGrindersParams) {
    const conditions: SQL[] = [eq(products.type, 'grinder'), eq(products.isActive, true)];
    if (params.brandId) {
      conditions.push(eq(products.brandId, params.brandId));
    }
    if (params.search) {
      conditions.push(ilike(products.name, `%${params.search}%`));
    }
    const where = and(...conditions);
    const offset = (params.page - 1) * params.limit;

    const [rows, totalRows] = await Promise.all([
      baseProductQuery(this.db)
        .innerJoin(grinderDetails, eq(products.id, grinderDetails.productId))
        .where(where)
        .limit(params.limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .innerJoin(grinderDetails, eq(products.id, grinderDetails.productId))
        .where(where),
    ]);

    return {
      data: rows.map((r) => mapProductListItem(r)),
      total: totalRows[0]?.count ?? 0,
      page: params.page,
    };
  }
}
