import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { brands } from './brands/brands.schema';
import { categories } from './categories/categories.schema';

export const productTypeEnum = pgEnum('product_type', ['bean', 'machine', 'grinder']);

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: productTypeEnum('type').notNull(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  brandId: uuid('brand_id').references(() => brands.id),
  categoryId: uuid('category_id').references(() => categories.id),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
