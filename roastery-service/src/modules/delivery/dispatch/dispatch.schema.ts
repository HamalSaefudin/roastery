import {
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../auth/auth.schema';
import { orders } from '../../orders/orders.schema';
import { drivers } from '../drivers/drivers.schema';
import { deliveryZones } from '../zones/zones.schema';

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',
  'assigned',
  'picked_up',
  'en_route',
  'delivered',
  'failed',
]);

export const settlementStatusEnum = pgEnum('settlement_status', [
  'pending',
  'confirmed',
]);

// Setoran tunai driver: dibuat sebelum baris deliveries yang di-settle mereferensikannya.
export const codSettlements = pgTable('cod_settlements', {
  id: uuid('id').defaultRandom().primaryKey(),
  settlementNumber: text('settlement_number').notNull().unique(),
  driverId: uuid('driver_id')
    .notNull()
    .references(() => drivers.id),
  amount: integer('amount').notNull(),
  status: settlementStatusEnum('status').notNull().default('pending'),
  confirmedBy: uuid('confirmed_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Hanya dibuat utk order delivery internal (createForOrder) — pickup & external tidak punya row di sini.
export const deliveries = pgTable('deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  deliveryNumber: text('delivery_number').notNull().unique(),
  orderId: uuid('order_id')
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: 'cascade' }),
  zoneId: uuid('zone_id').references(() => deliveryZones.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  status: deliveryStatusEnum('status').notNull().default('pending'),
  scheduledSlot: text('scheduled_slot'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  proofUrl: text('proof_url'),
  codAmount: integer('cod_amount'),
  codCollectedAt: timestamp('cod_collected_at', { withTimezone: true }),
  codSettlementId: uuid('cod_settlement_id').references(
    () => codSettlements.id,
  ),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const deliveryEvents = pgTable('delivery_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  deliveryId: uuid('delivery_id')
    .notNull()
    .references(() => deliveries.id, { onDelete: 'cascade' }),
  status: deliveryStatusEnum('status').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
