/**
 * Seed data referensi katalog (brands, origins, categories) — biji kopi
 * roastery Indonesia biasanya jual origin lokal + beberapa origin
 * internasional terkenal, brand mesin/grinder umum, kategori dasar.
 * Idempotent — aman di-run ulang (cek existing dulu / onConflictDoNothing).
 *
 * Jalankan: pnpm db:seed:catalog
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { brands } from '../src/modules/catalog/brands/brands.schema';
import { origins } from '../src/modules/catalog/origins/origins.schema';
import { categories } from '../src/modules/catalog/categories/categories.schema';
import { slugify } from '../src/common/slug.util';

const BRAND_ROWS = [
  { name: 'Rocket Espresso', description: 'Mesin espresso manual asal Italia, populer di kalangan pecinta kopi rumahan & kafe.' },
  { name: 'La Marzocco', description: 'Mesin espresso komersial premium asal Italia, standar banyak kafe spesialti.' },
  { name: 'Gaggia', description: 'Mesin espresso Italia, dikenal dengan seri entry-level yang terjangkau.' },
  { name: 'Breville', description: 'Mesin espresso & grinder asal Australia, populer utk home barista.' },
  { name: 'Fellow', description: 'Peralatan seduh manual & grinder desain modern asal Amerika Serikat.' },
  { name: 'Comandante', description: 'Grinder manual premium asal Jerman, favorit brewer manual.' },
  { name: 'Baratza', description: 'Grinder elektrik asal Amerika Serikat, populer di segmen rumahan-menengah.' },
  { name: 'Wega', description: 'Mesin espresso komersial asal Italia, umum dipakai kafe/roastery.' },
] as const;

const ORIGIN_ROWS = [
  { name: 'Gayo', country: 'Indonesia', region: 'Aceh', description: 'Proses semi-washed/giling basah khas Sumatra, body penuh, earthy & rempah.' },
  { name: 'Mandailing', country: 'Indonesia', region: 'Sumatera Utara', description: 'Body penuh, keasaman rendah, klasik rasa Sumatra.' },
  { name: 'Lintong', country: 'Indonesia', region: 'Sumatera Utara', description: 'Giling basah, herbal & earthy, body tebal.' },
  { name: 'Toraja', country: 'Indonesia', region: 'Sulawesi Selatan', description: 'Body penuh, sedikit pedas, kompleks — salah satu origin premium Indonesia.' },
  { name: 'Kintamani', country: 'Indonesia', region: 'Bali', description: 'Ditanam tumpang sari dgn jeruk, keasaman cerah, citrusy.' },
  { name: 'Bajawa', country: 'Indonesia', region: 'Flores, NTT', description: 'Body penuh, rasa cokelat & rempah, aftertaste manis.' },
  { name: 'Java Preanger', country: 'Indonesia', region: 'Jawa Barat', description: 'Seimbang, bersih, keasaman medium — gaya washed.' },
  { name: 'Yirgacheffe', country: 'Etiopia', region: 'Gedeo', description: 'Floral & citrusy, keasaman cerah — benchmark kopi washed dunia.' },
  { name: 'Sidamo', country: 'Etiopia', region: 'Sidama', description: 'Fruity, wine-like, proses natural.' },
  { name: 'Huila', country: 'Kolombia', region: 'Huila', description: 'Seimbang, manis karamel, keasaman medium.' },
  { name: 'Cerrado', country: 'Brasil', region: 'Cerrado Mineiro', description: 'Nutty & cokelat, keasaman rendah — cocok utk blend espresso.' },
  { name: 'Nyeri', country: 'Kenya', region: 'Nyeri', description: 'Keasaman cerah mirip blackcurrant, kompleks — proses washed.' },
] as const;

interface CategorySeed {
  name: string;
  children?: ReadonlyArray<string>;
}
const CATEGORY_ROWS: ReadonlyArray<CategorySeed> = [
  { name: 'Biji Kopi', children: ['Single Origin', 'Blend'] },
  { name: 'Mesin Espresso', children: ['Mesin Manual', 'Mesin Otomatis'] },
  { name: 'Grinder', children: ['Grinder Manual', 'Grinder Elektrik'] },
  { name: 'Aksesoris' },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('Seeding brands...');
  for (const row of BRAND_ROWS) {
    await db
      .insert(brands)
      .values({ name: row.name, slug: slugify(row.name), description: row.description })
      .onConflictDoNothing({ target: brands.slug });
  }

  console.log('Seeding origins...');
  for (const row of ORIGIN_ROWS) {
    const [existing] = await db.select().from(origins).where(eq(origins.name, row.name)).limit(1);
    if (!existing) {
      await db.insert(origins).values(row);
    }
  }

  console.log('Seeding categories...');
  for (const parent of CATEGORY_ROWS) {
    const slug = slugify(parent.name);
    await db.insert(categories).values({ name: parent.name, slug }).onConflictDoNothing({ target: categories.slug });
    const [parentRow] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (!parentRow) continue;
    for (const childName of parent.children ?? []) {
      const childSlug = slugify(childName);
      await db
        .insert(categories)
        .values({ name: childName, slug: childSlug, parentId: parentRow.id })
        .onConflictDoNothing({ target: categories.slug });
    }
  }

  console.log(`Done. ${BRAND_ROWS.length} brand, ${ORIGIN_ROWS.length} origin, ${CATEGORY_ROWS.length} kategori induk di-seed.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
