import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constants';
import type { DrizzleDB, DrizzleDbOrTx } from '../../database/drizzle.constants';
import { products } from '../catalog/catalog.schema';
import { beanVariants } from '../catalog/beans/beans.schema';
import { beanStock, equipmentUnits, stockMovements } from './inventory.schema';
import type { CreateEquipmentUnitDto, UpdateEquipmentUnitDto } from './dto/equipment-unit.dto';
import type { SetBeanStockDto } from './dto/set-bean-stock.dto';

interface BeanStockRow {
  variantId: string;
  sku: string;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
}

interface ListEquipmentUnitsParams {
  productId?: string;
  status?: string;
  page: number;
  limit: number;
}

@Injectable()
export class InventoryService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private mapBeanStock(row: BeanStockRow) {
    return {
      variantId: row.variantId,
      sku: row.sku,
      quantity: row.quantity,
      reserved: row.reserved,
      available: row.quantity - row.reserved,
      lowStockThreshold: row.lowStockThreshold,
    };
  }

  private beanStockQuery() {
    return this.db
      .select({
        variantId: beanStock.variantId,
        sku: beanVariants.sku,
        quantity: beanStock.quantity,
        reserved: beanStock.reserved,
        lowStockThreshold: beanStock.lowStockThreshold,
      })
      .from(beanStock)
      .innerJoin(beanVariants, eq(beanStock.variantId, beanVariants.id));
  }

  async overview() {
    const [beanRows, countRows] = await Promise.all([
      this.beanStockQuery(),
      this.db
        .select({ status: equipmentUnits.status, count: sql<number>`count(*)::int` })
        .from(equipmentUnits)
        .groupBy(equipmentUnits.status),
    ]);

    const equipmentCounts: Record<string, number> = {};
    for (const row of countRows) {
      equipmentCounts[row.status] = row.count;
    }

    return {
      beans: beanRows.map((r) => this.mapBeanStock(r)),
      equipmentCounts,
    };
  }

  async lowStock() {
    const rows = await this.beanStockQuery().where(
      sql`${beanStock.quantity} - ${beanStock.reserved} <= ${beanStock.lowStockThreshold}`,
    );
    return { data: rows.map((r) => this.mapBeanStock(r)) };
  }

  async setBeanStock(variantId: string, dto: SetBeanStockDto) {
    const variant = await this.db.query.beanVariants.findFirst({
      where: eq(beanVariants.id, variantId),
    });
    if (!variant) {
      throw new NotFoundException('Varian tidak ditemukan');
    }

    return this.db.transaction(async (tx) => {
      const existing = await tx.query.beanStock.findFirst({
        where: eq(beanStock.variantId, variantId),
      });
      const oldQuantity = existing?.quantity ?? 0;
      const change = dto.quantity - oldQuantity;
      const lowStockThreshold = dto.lowStockThreshold ?? existing?.lowStockThreshold ?? 5;

      const [stock] = existing
        ? await tx
            .update(beanStock)
            .set({ quantity: dto.quantity, lowStockThreshold, updatedAt: new Date() })
            .where(eq(beanStock.variantId, variantId))
            .returning()
        : await tx
            .insert(beanStock)
            .values({ variantId, quantity: dto.quantity, lowStockThreshold })
            .returning();

      await tx.insert(stockMovements).values({ variantId, change, reason: dto.reason });

      return this.mapBeanStock({ ...stock, sku: variant.sku });
    });
  }

  async createEquipmentUnit(dto: CreateEquipmentUnitDto) {
    const product = await this.db.query.products.findFirst({
      where: eq(products.id, dto.productId),
    });
    if (!product || product.type === 'bean') {
      throw new NotFoundException('Produk mesin/grinder tidak ditemukan');
    }

    const existing = await this.db.query.equipmentUnits.findFirst({
      where: eq(equipmentUnits.serialNumber, dto.serialNumber),
    });
    if (existing) {
      throw new ConflictException('Serial number sudah ada');
    }

    return this.db.transaction(async (tx) => {
      const [unit] = await tx
        .insert(equipmentUnits)
        .values({ productId: dto.productId, serialNumber: dto.serialNumber })
        .returning();
      await tx.insert(stockMovements).values({ unitId: unit.id, change: 1, reason: 'purchase' });
      return unit;
    });
  }

  async listEquipmentUnits(params: ListEquipmentUnitsParams) {
    const conditions: SQL[] = [];
    if (params.productId) {
      conditions.push(eq(equipmentUnits.productId, params.productId));
    }
    if (params.status) {
      conditions.push(eq(equipmentUnits.status, params.status as 'in_stock'));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.limit;

    const [rows, totalRows] = await Promise.all([
      this.db.select().from(equipmentUnits).where(where).limit(params.limit).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(equipmentUnits).where(where),
    ]);

    return { data: rows, total: totalRows[0]?.count ?? 0 };
  }

  async updateEquipmentUnitStatus(id: string, dto: UpdateEquipmentUnitDto) {
    const existing = await this.db.query.equipmentUnits.findFirst({
      where: eq(equipmentUnits.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Unit tidak ditemukan');
    }

    return this.db.transaction(async (tx) => {
      const [unit] = await tx
        .update(equipmentUnits)
        .set({ status: dto.status })
        .where(eq(equipmentUnits.id, id))
        .returning();
      await tx.insert(stockMovements).values({ unitId: id, change: 0, reason: 'adjustment' });
      return unit;
    });
  }

  async availability(variantId?: string, productId?: string) {
    if (variantId) {
      const stock = await this.db.query.beanStock.findFirst({
        where: eq(beanStock.variantId, variantId),
      });
      const available = stock ? stock.quantity - stock.reserved : 0;
      return { available: available > 0, quantity: Math.max(available, 0) };
    }
    if (productId) {
      const [row] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(equipmentUnits)
        .where(and(eq(equipmentUnits.productId, productId), eq(equipmentUnits.status, 'in_stock')));
      const quantity = row?.count ?? 0;
      return { available: quantity > 0, quantity };
    }
    throw new BadRequestException('variantId atau productId wajib diisi');
  }

  // --- Dipakai modul Orders (lewat DI, bukan HTTP) — lihat plan.md Aturan Implementasi §2-6 ---

  async reserveBeanStock(
    variantId: string,
    qty: number,
    orderId: string,
    tx: DrizzleDbOrTx = this.db,
  ): Promise<void> {
    const [row] = await tx
      .select()
      .from(beanStock)
      .where(eq(beanStock.variantId, variantId))
      .for('update');
    if (!row || row.quantity - row.reserved < qty) {
      throw new ConflictException('Stok tidak cukup');
    }
    await tx
      .update(beanStock)
      .set({ reserved: row.reserved + qty, updatedAt: new Date() })
      .where(eq(beanStock.variantId, variantId));
    await tx.insert(stockMovements).values({
      variantId,
      change: -qty,
      reason: 'reserve',
      refOrderId: orderId,
    });
  }

  async releaseBeanStock(
    variantId: string,
    qty: number,
    orderId: string,
    tx: DrizzleDbOrTx = this.db,
  ): Promise<void> {
    await tx
      .update(beanStock)
      .set({ reserved: sql`${beanStock.reserved} - ${qty}`, updatedAt: new Date() })
      .where(eq(beanStock.variantId, variantId));
    await tx.insert(stockMovements).values({
      variantId,
      change: qty,
      reason: 'release',
      refOrderId: orderId,
    });
  }

  async commitBeanStock(
    variantId: string,
    qty: number,
    orderId: string,
    tx: DrizzleDbOrTx = this.db,
  ): Promise<void> {
    await tx
      .update(beanStock)
      .set({
        quantity: sql`${beanStock.quantity} - ${qty}`,
        reserved: sql`${beanStock.reserved} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(eq(beanStock.variantId, variantId));
    await tx.insert(stockMovements).values({
      variantId,
      change: -qty,
      reason: 'sale',
      refOrderId: orderId,
    });
  }

  async reserveEquipmentUnits(
    productId: string,
    qty: number,
    orderId: string,
    tx: DrizzleDbOrTx = this.db,
  ): Promise<string[]> {
    const rows = await tx
      .select()
      .from(equipmentUnits)
      .where(and(eq(equipmentUnits.productId, productId), eq(equipmentUnits.status, 'in_stock')))
      .orderBy(asc(equipmentUnits.createdAt))
      .limit(qty)
      .for('update');
    if (rows.length < qty) {
      throw new ConflictException('Stok unit tidak cukup');
    }
    const ids = rows.map((r) => r.id);
    await tx.update(equipmentUnits).set({ status: 'reserved' }).where(inArray(equipmentUnits.id, ids));
    for (const id of ids) {
      await tx.insert(stockMovements).values({ unitId: id, change: 0, reason: 'reserve', refOrderId: orderId });
    }
    return ids;
  }

  async releaseEquipmentUnits(
    unitIds: string[],
    orderId: string,
    tx: DrizzleDbOrTx = this.db,
  ): Promise<void> {
    await tx.update(equipmentUnits).set({ status: 'in_stock' }).where(inArray(equipmentUnits.id, unitIds));
    for (const id of unitIds) {
      await tx.insert(stockMovements).values({ unitId: id, change: 0, reason: 'release', refOrderId: orderId });
    }
  }

  async commitEquipmentUnits(
    unitIds: string[],
    orderId: string,
    tx: DrizzleDbOrTx = this.db,
  ): Promise<void> {
    await tx.update(equipmentUnits).set({ status: 'sold' }).where(inArray(equipmentUnits.id, unitIds));
    for (const id of unitIds) {
      await tx.insert(stockMovements).values({ unitId: id, change: 0, reason: 'sale', refOrderId: orderId });
    }
  }
}
