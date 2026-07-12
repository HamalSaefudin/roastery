import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';

// district_codes: array of string kode kecamatan (regions). Zona fallback (is_fallback=true) district_codes-nya kosong.
export const deliveryZones = pgTable('delivery_zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  districtCodes: jsonb('district_codes')
    .$type<string[]>()
    .notNull()
    .default([]),
  fee: integer('fee').notNull(),
  etaText: text('eta_text'),
  isActive: boolean('is_active').notNull().default(true),
  isFallback: boolean('is_fallback').notNull().default(false),
});
