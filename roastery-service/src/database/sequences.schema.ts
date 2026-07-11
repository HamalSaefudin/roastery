import { bigint, pgTable, text } from 'drizzle-orm/pg-core';

/**
 * Tabel counter transaksional untuk kode publik ber-sequence (CUS-/BEN-/ORD- dst).
 * Increment terjadi di dalam transaksi insert yang sama (gapless, aman dari race)
 * — lihat src/common/sequence.util.ts. Lihat konvensi §16 untuk registry lengkap.
 */
export const sequenceCounters = pgTable('sequence_counters', {
  name: text('name').primaryKey(), // mis. 'customer', 'product_bean', 'order:20260709'
  value: bigint('value', { mode: 'number' }).notNull().default(0),
});
