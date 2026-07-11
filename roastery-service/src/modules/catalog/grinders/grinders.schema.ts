import { integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { products } from '../catalog.schema';

export const grinderDetails = pgTable('grinder_details', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  burrType: text('burr_type').notNull(),
  specs: jsonb('specs'),
  warrantyMonths: integer('warranty_months').notNull(),
});
