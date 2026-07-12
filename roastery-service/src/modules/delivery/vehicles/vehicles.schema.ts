import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const vehicleTypeEnum = pgEnum('vehicle_type', [
  'motor',
  'mobil',
  'van',
]);

export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  plateNumber: text('plate_number').notNull().unique(),
  type: vehicleTypeEnum('type').notNull(),
  capacityKg: integer('capacity_kg'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
