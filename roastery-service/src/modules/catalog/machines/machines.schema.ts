import { integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { products } from '../catalog.schema';

export const machineDetails = pgTable('machine_details', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  specs: jsonb('specs'),
  voltage: text('voltage'),
  warrantyMonths: integer('warranty_months').notNull(),
});
