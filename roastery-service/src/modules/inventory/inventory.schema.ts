import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { beanVariants } from '../catalog/beans/beans.schema';
import { products } from '../catalog/catalog.schema';

export const beanStock = pgTable('bean_stock', {
  variantId: uuid('variant_id')
    .primaryKey()
    .references(() => beanVariants.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(0),
  reserved: integer('reserved').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const unitStatusEnum = pgEnum('unit_status', ['in_stock', 'reserved', 'sold', 'defective']);

export const equipmentUnits = pgTable('equipment_units', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  serialNumber: text('serial_number').notNull().unique(),
  status: unitStatusEnum('status').notNull().default('in_stock'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const movementReasonEnum = pgEnum('movement_reason', [
  'purchase',
  'sale',
  'adjustment',
  'return',
  'reserve',
  'release',
]);

// variant_id/unit_id set null saat entitasnya dihapus (histori movement tetap ada) —
// pola sama dengan FK "reviewer" di konvensi §5, bukan FK "owner".
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  variantId: uuid('variant_id').references(() => beanVariants.id, { onDelete: 'set null' }),
  unitId: uuid('unit_id').references(() => equipmentUnits.id, { onDelete: 'set null' }),
  change: integer('change').notNull(),
  reason: movementReasonEnum('reason').notNull(),
  // FK ke orders ditambahkan saat modul 06 Orders dibuat (tabel belum ada).
  refOrderId: uuid('ref_order_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
