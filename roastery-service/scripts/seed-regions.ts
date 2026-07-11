/**
 * Seed master wilayah (provinces → regencies → districts → villages).
 * Sumber: scripts/data/wilayah.sql (cahyadsn/wilayah) + scripts/data/wilayah_kodepos.sql (cahyadsn/wilayah_kodepos).
 * Idempotent — aman di-run ulang (onConflictDoNothing per baris).
 *
 * Jalankan: pnpm db:seed:regions
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { districts, provinces, regencies, villages } from '../src/modules/regions/regions.schema';

const BATCH_SIZE = 1000;
const DATA_DIR = join(__dirname, 'data');

function parseWilayah(filePath: string): Map<string, string> {
  const raw = readFileSync(filePath, 'utf-8');
  const map = new Map<string, string>();
  const re = /\('([\d.]+)',\s*'((?:''|[^'])*)'\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    map.set(m[1], m[2].replace(/''/g, "'"));
  }
  return map;
}

function parseKodepos(filePath: string): Map<string, string> {
  const raw = readFileSync(filePath, 'utf-8');
  const map = new Map<string, string>();
  const re = /\('([\d.]+)',\s*'(\d{5})'\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    map.set(m[1], m[2]);
  }
  return map;
}

async function batchInsert<T extends Record<string, unknown>>(
  db: ReturnType<typeof drizzle>,
  table: Parameters<ReturnType<typeof drizzle>['insert']>[0],
  rows: T[],
  conflictTarget: unknown,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.insert(table).values(chunk) as any).onConflictDoNothing({ target: conflictTarget });
  }
}

async function main() {
  const wilayahMap = parseWilayah(join(DATA_DIR, 'wilayah.sql'));
  const kodeposMap = parseKodepos(join(DATA_DIR, 'wilayah_kodepos.sql'));

  const provinceRows: { code: string; name: string }[] = [];
  const regencyRows: {
    code: string;
    provinceCode: string;
    name: string;
    type: 'kota' | 'kabupaten';
  }[] = [];
  const districtRows: { code: string; regencyCode: string; name: string }[] = [];
  const villageRows: {
    code: string;
    districtCode: string;
    name: string;
    postalCode: string | null;
  }[] = [];

  for (const [code, name] of wilayahMap) {
    const dots = (code.match(/\./g) ?? []).length;
    if (dots === 0) {
      provinceRows.push({ code, name });
    } else if (dots === 1) {
      const provinceCode = code.split('.')[0];
      const type: 'kota' | 'kabupaten' = name.toLowerCase().startsWith('kota ')
        ? 'kota'
        : 'kabupaten';
      regencyRows.push({ code, provinceCode, name, type });
    } else if (dots === 2) {
      const regencyCode = code.split('.').slice(0, 2).join('.');
      districtRows.push({ code, regencyCode, name });
    } else if (dots === 3) {
      const districtCode = code.split('.').slice(0, 3).join('.');
      villageRows.push({ code, districtCode, name, postalCode: kodeposMap.get(code) ?? null });
    }
  }

  console.log(
    `Parsed: ${provinceRows.length} provinces, ${regencyRows.length} regencies, ${districtRows.length} districts, ${villageRows.length} villages`,
  );

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('Seeding provinces...');
  await batchInsert(db, provinces, provinceRows, provinces.code);
  console.log('Seeding regencies...');
  await batchInsert(db, regencies, regencyRows, regencies.code);
  console.log('Seeding districts...');
  await batchInsert(db, districts, districtRows, districts.code);
  console.log('Seeding villages...');
  await batchInsert(db, villages, villageRows, villages.code);

  console.log('Done.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
