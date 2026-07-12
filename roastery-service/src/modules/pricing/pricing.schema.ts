import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { beanVariants } from '../catalog/beans/beans.schema';
import { products } from '../catalog/catalog.schema';

// Isi salah satu: variant_id (biji) ATAU product_id (equipment) — XOR dijaga di DB, bukan cuma app.
// Unique index parsial: maksimal 1 baris harga aktif per variant/product (biar resolvePrice() tidak ambigu).
export const prices = pgTable(
  'prices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id').references(() => beanVariants.id, {
      onDelete: 'cascade',
    }),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'cascade',
    }),
    price: integer('price').notNull(),
    currency: text('currency').notNull().default('IDR'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'prices_variant_or_product_xor',
      sql`(${table.variantId} is null) <> (${table.productId} is null)`,
    ),
    uniqueIndex('prices_variant_id_unique')
      .on(table.variantId)
      .where(sql`${table.variantId} is not null`),
    uniqueIndex('prices_product_id_unique')
      .on(table.productId)
      .where(sql`${table.productId} is not null`),
  ],
);

export const wholesaleTiers = pgTable('wholesale_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  minQuantity: integer('min_quantity').notNull(),
  discountPercent: integer('discount_percent').notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

export const promoTypeEnum = pgEnum('promo_type', ['percent', 'fixed']);

export const promoCodes = pgTable('promo_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  type: promoTypeEnum('type').notNull(),
  value: integer('value').notNull(),
  minOrder: integer('min_order'),
  maxDiscount: integer('max_discount'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});
