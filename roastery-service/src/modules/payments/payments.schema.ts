import {
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { orders } from '../orders/orders.schema';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
]);

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentNumber: text('payment_number').notNull().unique(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerRef: text('provider_ref'),
  method: text('method'),
  amount: integer('amount').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const refunds = pgTable('refunds', {
  id: uuid('id').defaultRandom().primaryKey(),
  refundNumber: text('refund_number').notNull().unique(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('requested'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'issued',
  'paid',
  'overdue',
  'cancelled',
]);

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  amount: integer('amount').notNull(),
  dueDate: date('due_date').notNull(),
  status: invoiceStatusEnum('status').notNull().default('issued'),
  issuedAt: timestamp('issued_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
});
