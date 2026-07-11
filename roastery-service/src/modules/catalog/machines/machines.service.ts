import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { products } from '../catalog.schema';
import { baseProductQuery, mapProductListItem } from '../catalog.query';
import { machineDetails } from './machines.schema';

interface ListMachinesParams {
  brandId?: string;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class MachinesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listPublic(params: ListMachinesParams) {
    const conditions: SQL[] = [eq(products.type, 'machine'), eq(products.isActive, true)];
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
        .innerJoin(machineDetails, eq(products.id, machineDetails.productId))
        .where(where)
        .limit(params.limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .innerJoin(machineDetails, eq(products.id, machineDetails.productId))
        .where(where),
    ]);

    return {
      data: rows.map((r) => mapProductListItem(r)),
      total: totalRows[0]?.count ?? 0,
      page: params.page,
    };
  }
}
