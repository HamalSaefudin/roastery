import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema';
import {
  districts,
  provinces,
  regencies,
  villages,
} from '../regions/regions.schema';

export const customerTypeEnum = pgEnum('customer_type', [
  'retail',
  'wholesale',
]);
export const wholesaleStatusEnum = pgEnum('wholesale_status', [
  'pending',
  'approved',
  'rejected',
]);

export const customerProfiles = pgTable('customer_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  fullName: text('full_name').notNull().default(''),
  phone: text('phone'),
  customerType: customerTypeEnum('customer_type').notNull().default('retail'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customerProfiles.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  recipientName: text('recipient_name').notNull(),
  phone: text('phone').notNull(),
  line1: text('line1').notNull(),
  line2: text('line2'),
  provinceCode: text('province_code')
    .notNull()
    .references(() => provinces.code),
  regencyCode: text('regency_code')
    .notNull()
    .references(() => regencies.code),
  districtCode: text('district_code')
    .notNull()
    .references(() => districts.code),
  villageCode: text('village_code').references(() => villages.code),
  postalCode: text('postal_code').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const wholesaleApplications = pgTable('wholesale_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customerProfiles.id, { onDelete: 'cascade' }),
  businessName: text('business_name').notNull(),
  taxId: text('tax_id'),
  status: wholesaleStatusEnum('status').notNull().default('pending'),
  note: text('note'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
