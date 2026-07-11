import { sql } from 'drizzle-orm';
import type { DrizzleDbOrTx } from '../database/drizzle.constants';

/** Ambil nilai berikutnya utk counter `name`. WAJIB dipanggil di dalam transaksi insert-nya. */
export async function nextSequence(
  tx: DrizzleDbOrTx,
  name: string,
): Promise<number> {
  const res = await tx.execute(sql`
    INSERT INTO sequence_counters (name, value) VALUES (${name}, 1)
    ON CONFLICT (name) DO UPDATE SET value = sequence_counters.value + 1
    RETURNING value
  `);
  return Number((res.rows[0] as { value: number | string }).value);
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const ym = (d: Date) => ymd(d).slice(0, 6);

export interface NextCodeOptions {
  prefix: string;
  scope: 'global' | 'daily' | 'monthly';
  width: number;
  /** Nama counter di tabel sequence_counters — default `prefix` lowercase. */
  counter?: string;
}

/** Bentuk kode publik sesuai registry konvensi §16 (mis. CUS-000123, ORD-20260709-0001). */
export async function nextCode(
  tx: DrizzleDbOrTx,
  opts: NextCodeOptions,
): Promise<string> {
  const now = new Date();
  const base = opts.counter ?? opts.prefix.toLowerCase();
  if (opts.scope === 'daily') {
    const n = await nextSequence(tx, `${base}:${ymd(now)}`);
    return `${opts.prefix}-${ymd(now)}-${pad(n, opts.width)}`;
  }
  if (opts.scope === 'monthly') {
    const n = await nextSequence(tx, `${base}:${ym(now)}`);
    return `${opts.prefix}-${ym(now)}-${pad(n, opts.width)}`;
  }
  const n = await nextSequence(tx, base);
  return `${opts.prefix}-${pad(n, opts.width)}`;
}
