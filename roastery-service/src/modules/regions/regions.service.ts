import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { asc, eq, ilike } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constants';
import type { DrizzleDB } from '../../database/drizzle.constants';
import { districts, provinces, regencies, villages } from './regions.schema';

type SearchLevel = 'province' | 'regency' | 'district' | 'village';
const SEARCH_LEVELS: SearchLevel[] = [
  'province',
  'regency',
  'district',
  'village',
];
const SEARCH_LIMIT_PER_LEVEL = 15;

@Injectable()
export class RegionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  findAllProvinces() {
    return this.db.select().from(provinces).orderBy(asc(provinces.name));
  }

  findRegencies(provinceCode?: string) {
    if (!provinceCode) {
      throw new BadRequestException('provinceCode wajib diisi');
    }
    return this.db
      .select()
      .from(regencies)
      .where(eq(regencies.provinceCode, provinceCode))
      .orderBy(asc(regencies.name));
  }

  findDistricts(regencyCode?: string) {
    if (!regencyCode) {
      throw new BadRequestException('regencyCode wajib diisi');
    }
    return this.db
      .select()
      .from(districts)
      .where(eq(districts.regencyCode, regencyCode))
      .orderBy(asc(districts.name));
  }

  findVillages(districtCode?: string) {
    if (!districtCode) {
      throw new BadRequestException('districtCode wajib diisi');
    }
    return this.db
      .select()
      .from(villages)
      .where(eq(villages.districtCode, districtCode))
      .orderBy(asc(villages.name));
  }

  async search(q?: string, level?: string) {
    if (!q) {
      throw new BadRequestException('q wajib diisi');
    }
    const levels = level ? [level as SearchLevel] : SEARCH_LEVELS;
    for (const lvl of levels) {
      if (!SEARCH_LEVELS.includes(lvl)) {
        throw new BadRequestException(
          `level tidak valid, pilih salah satu: ${SEARCH_LEVELS.join(', ')}`,
        );
      }
    }

    const pattern = `%${q}%`;
    const results: { code: string; name: string; level: SearchLevel }[] = [];

    if (levels.includes('province')) {
      const rows = await this.db
        .select({ code: provinces.code, name: provinces.name })
        .from(provinces)
        .where(ilike(provinces.name, pattern))
        .limit(SEARCH_LIMIT_PER_LEVEL);
      results.push(...rows.map((r) => ({ ...r, level: 'province' as const })));
    }
    if (levels.includes('regency')) {
      const rows = await this.db
        .select({ code: regencies.code, name: regencies.name })
        .from(regencies)
        .where(ilike(regencies.name, pattern))
        .limit(SEARCH_LIMIT_PER_LEVEL);
      results.push(...rows.map((r) => ({ ...r, level: 'regency' as const })));
    }
    if (levels.includes('district')) {
      const rows = await this.db
        .select({ code: districts.code, name: districts.name })
        .from(districts)
        .where(ilike(districts.name, pattern))
        .limit(SEARCH_LIMIT_PER_LEVEL);
      results.push(...rows.map((r) => ({ ...r, level: 'district' as const })));
    }
    if (levels.includes('village')) {
      const rows = await this.db
        .select({ code: villages.code, name: villages.name })
        .from(villages)
        .where(ilike(villages.name, pattern))
        .limit(SEARCH_LIMIT_PER_LEVEL);
      results.push(...rows.map((r) => ({ ...r, level: 'village' as const })));
    }

    return results;
  }
}
