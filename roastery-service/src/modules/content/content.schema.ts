import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema';

export const contentTypeEnum = pgEnum('content_type', [
  'brew_guide',
  'blog',
  'origin_story',
  'page',
]);
export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'published',
]);

export const contentArticles = pgTable('content_articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: contentTypeEnum('type').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt'),
  body: text('body').notNull(),
  coverImageUrl: text('cover_image_url'),
  tags: jsonb('tags').$type<string[]>(),
  authorId: uuid('author_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  status: contentStatusEnum('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
