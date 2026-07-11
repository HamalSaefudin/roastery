import { pgEnum, pgTable, text, index } from 'drizzle-orm/pg-core';

/**
 * Master wilayah Indonesia — 4 level (provinsi → kab/kota → kecamatan → kelurahan/desa).
 * PK pakai kode resmi Kemendagri (text), bukan uuid — memudahkan seeding & lookup.
 * Data bersifat referensi (di-seed dari scripts/data/), read-only lewat API.
 */

export const regencyTypeEnum = pgEnum('regency_type', ['kota', 'kabupaten']);

export const provinces = pgTable('provinces', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
});

export const regencies = pgTable(
  'regencies',
  {
    code: text('code').primaryKey(),
    provinceCode: text('province_code')
      .notNull()
      .references(() => provinces.code, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: regencyTypeEnum('type').notNull(),
  },
  (table) => [index('regencies_province_code_idx').on(table.provinceCode)],
);

export const districts = pgTable(
  'districts',
  {
    code: text('code').primaryKey(),
    regencyCode: text('regency_code')
      .notNull()
      .references(() => regencies.code, { onDelete: 'cascade' }),
    name: text('name').notNull(),
  },
  (table) => [index('districts_regency_code_idx').on(table.regencyCode)],
);

export const villages = pgTable(
  'villages',
  {
    code: text('code').primaryKey(),
    districtCode: text('district_code')
      .notNull()
      .references(() => districts.code, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    postalCode: text('postal_code'),
  },
  (table) => [index('villages_district_code_idx').on(table.districtCode)],
);
