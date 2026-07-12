/**
 * Barrel semua schema Drizzle.
 *
 * Setiap modul mendefinisikan tabelnya di `src/modules/<modul>/<modul>.schema.ts`,
 * lalu di-re-export di sini. File ini jadi satu sumber schema untuk:
 *  - runtime (koneksi Drizzle di database.module.ts), dan
 *  - drizzle-kit (generate & migrate), lihat drizzle.config.ts.
 *
 * Contoh nanti:
 *   export * from '../modules/customers/customers.schema';
 *   export * from '../modules/catalog/beans/beans.schema';
 */
export * from '../modules/regions/regions.schema';
export * from '../modules/auth/auth.schema';
export * from './sequences.schema';
export * from '../modules/customers/customers.schema';
export * from '../modules/catalog/brands/brands.schema';
export * from '../modules/catalog/origins/origins.schema';
export * from '../modules/catalog/categories/categories.schema';
export * from '../modules/catalog/catalog.schema';
export * from '../modules/catalog/beans/beans.schema';
export * from '../modules/catalog/machines/machines.schema';
export * from '../modules/catalog/grinders/grinders.schema';
export * from '../modules/inventory/inventory.schema';
export * from '../modules/pricing/pricing.schema';
export * from '../modules/orders/orders.schema';
export * from '../modules/payments/payments.schema';
export * from '../modules/delivery/vehicles/vehicles.schema';
export * from '../modules/delivery/zones/zones.schema';
export * from '../modules/delivery/drivers/drivers.schema';
export * from '../modules/delivery/dispatch/dispatch.schema';
export * from '../modules/service-desk/warranty/warranty.schema';
export * from '../modules/service-desk/repairs/repairs.schema';
export * from '../modules/content/content.schema';
