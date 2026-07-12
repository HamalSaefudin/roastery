import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../auth/auth.schema';
import { customerProfiles } from '../../customers/customers.schema';
import { equipmentUnits } from '../../inventory/inventory.schema';
import { warranties } from '../warranty/warranty.schema';

export const repairStatusEnum = pgEnum('repair_status', [
  'open',
  'diagnosing',
  'in_progress',
  'waiting_parts',
  'completed',
  'cancelled',
]);

export const repairTickets = pgTable('repair_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketNumber: text('ticket_number').notNull().unique(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customerProfiles.id, { onDelete: 'cascade' }),
  equipmentUnitId: uuid('equipment_unit_id').references(
    () => equipmentUnits.id,
    {
      onDelete: 'set null',
    },
  ),
  warrantyId: uuid('warranty_id').references(() => warranties.id, {
    onDelete: 'set null',
  }),
  isWarranty: boolean('is_warranty').notNull().default(false),
  issue: text('issue').notNull(),
  status: repairStatusEnum('status').notNull().default('open'),
  assignedTo: uuid('assigned_to').references(() => users.id, {
    onDelete: 'set null',
  }),
  cost: integer('cost'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const repairUpdates = pgTable('repair_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => repairTickets.id, { onDelete: 'cascade' }),
  status: repairStatusEnum('status').notNull(),
  note: text('note'),
  parts: jsonb('parts'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
