import {
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../auth/auth.schema';
import { customerProfiles } from '../customers/customers.schema';
import { products } from '../catalog/catalog.schema';
import { beanVariants } from '../catalog/beans/beans.schema';

export const orderStatusEnum = pgEnum('order_status', [
  'created',
  'paid',
  'processing',
  'out_for_delivery',
  'ready_for_pickup',
  'delivered',
  'cancelled',
]);
export const paymentTypeEnum = pgEnum('payment_type', ['prepaid', 'invoice']);
export const fulfillmentMethodEnum = pgEnum('fulfillment_method', [
  'delivery',
  'pickup',
]);
export const shippingMethodEnum = pgEnum('shipping_method', [
  'internal',
  'external',
]);

// Satu keranjang aktif per customer (bukan multi-cart).
export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .unique()
    .references(() => customerProfiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => beanVariants.id, {
      onDelete: 'cascade',
    }),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'cascade',
    }),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'cart_items_variant_or_product_xor',
      sql`(${table.variantId} is null) <> (${table.productId} is null)`,
    ),
  ],
);

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customerProfiles.id, { onDelete: 'cascade' }),
  status: orderStatusEnum('status').notNull().default('created'),
  paymentType: paymentTypeEnum('payment_type').notNull().default('prepaid'),
  fulfillmentMethod: fulfillmentMethodEnum('fulfillment_method')
    .notNull()
    .default('delivery'),
  shippingMethod: shippingMethodEnum('shipping_method'),
  courierName: text('courier_name'),
  trackingNumber: text('tracking_number'),
  pickupCode: text('pickup_code'),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  deliveryFee: integer('delivery_fee').notNull().default(0),
  total: integer('total').notNull(),
  promoCode: text('promo_code'),
  deliveryAddress: jsonb('delivery_address'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Snapshot: harga & nama dikunci saat order dibuat, tidak ikut berubah kalau produk diedit belakangan.
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  // set null (bukan cascade/no action): order_items sudah snapshot lengkap (name/grind/weightGrams/unitPrice),
  // jadi produk/varian boleh dihapus tanpa terhalang riwayat order — histori order tetap utuh.
  productId: uuid('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  variantId: uuid('variant_id').references(() => beanVariants.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  grind: text('grind'),
  weightGrams: integer('weight_grams'),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  lineTotal: integer('line_total').notNull(),
});

export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  status: orderStatusEnum('status').notNull(),
  changedBy: uuid('changed_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
