import { date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customerProfiles } from '../../customers/customers.schema';
import { orders } from '../../orders/orders.schema';
import { equipmentUnits } from '../../inventory/inventory.schema';

export const warranties = pgTable('warranties', {
  id: uuid('id').defaultRandom().primaryKey(),
  warrantyNumber: text('warranty_number').notNull().unique(),
  equipmentUnitId: uuid('equipment_unit_id')
    .notNull()
    .unique()
    .references(() => equipmentUnits.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customerProfiles.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id, {
    onDelete: 'set null',
  }),
  serialNumber: text('serial_number').notNull(),
  startsAt: date('starts_at').notNull(),
  endsAt: date('ends_at').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
