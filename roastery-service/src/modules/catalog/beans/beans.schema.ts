import { boolean, date, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { products } from '../catalog.schema';
import { origins } from '../origins/origins.schema';

export const beanProcessEnum = pgEnum('bean_process', ['washed', 'natural', 'honey', 'other']);
export const roastLevelEnum = pgEnum('roast_level', ['light', 'medium', 'dark']);
// Keputusan bisnis (gambaran-bisnis.md): model roasting campuran per produk.
export const beanFulfillmentEnum = pgEnum('bean_fulfillment', ['ready_stock', 'roast_to_order']);
export const grindTypeEnum = pgEnum('grind_type', [
  'whole',
  'espresso',
  'v60',
  'french_press',
  'moka_pot',
  'drip',
]);

export const beanDetails = pgTable('bean_details', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  originId: uuid('origin_id').references(() => origins.id),
  process: beanProcessEnum('process').notNull(),
  roastLevel: roastLevelEnum('roast_level').notNull(),
  fulfillmentType: beanFulfillmentEnum('fulfillment_type').notNull().default('ready_stock'),
  altitude: text('altitude'),
  variety: text('variety'),
  tastingNotes: text('tasting_notes'),
  roastedAt: date('roasted_at'),
});

// sku auto-generate <kodeProduk>-<berat>-<GILING> (konvensi §16) — bukan input manual.
export const beanVariants = pgTable('bean_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  weightGrams: integer('weight_grams').notNull(),
  grind: grindTypeEnum('grind').notNull().default('whole'),
  sku: text('sku').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
});
