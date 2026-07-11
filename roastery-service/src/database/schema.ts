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
