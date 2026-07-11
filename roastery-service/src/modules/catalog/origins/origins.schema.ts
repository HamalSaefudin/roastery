import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const origins = pgTable('origins', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  region: text('region'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
});
