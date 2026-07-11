import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/** Token untuk inject koneksi Drizzle. Pakai: `@Inject(DRIZZLE) private db: DrizzleDB`. */
export const DRIZZLE = Symbol('DRIZZLE_CONNECTION');

/** Token untuk inject pg.Pool mentah (dipakai internal DatabaseModule untuk graceful shutdown). */
export const PG_POOL = Symbol('PG_POOL');

/** Tipe koneksi Drizzle beserta seluruh schema (untuk query type-safe + relasi). */
export type DrizzleDB = NodePgDatabase<typeof schema>;

/** Tipe transaksi aktif (parameter callback `db.transaction(async (tx) => ...)`). */
export type DrizzleTx = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

/** Dipakai fungsi yang boleh jalan lepas ATAU di dalam transaksi yang sudah ada (mis. sequence util). */
export type DrizzleDbOrTx = DrizzleDB | DrizzleTx;
