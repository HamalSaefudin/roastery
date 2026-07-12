import {
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../auth/auth.schema';
import { vehicles } from '../vehicles/vehicles.schema';

export const drivers = pgTable('drivers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  isAvailable: boolean('is_available').notNull().default(true),
  currentLat: doublePrecision('current_lat'),
  currentLng: doublePrecision('current_lng'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
