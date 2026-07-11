import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
  isActive: boolean('is_active').notNull().default(true),
});
