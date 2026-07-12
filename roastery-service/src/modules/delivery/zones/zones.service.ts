import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { deliveryZones } from './zones.schema';
import type { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

@Injectable()
export class ZonesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  findAllActive() {
    return this.db
      .select()
      .from(deliveryZones)
      .where(eq(deliveryZones.isActive, true));
  }

  private async assertNoDistrictOverlap(
    districtCodes: string[],
    excludeZoneId?: string,
  ) {
    const activeZones = await this.db
      .select()
      .from(deliveryZones)
      .where(
        and(
          eq(deliveryZones.isActive, true),
          eq(deliveryZones.isFallback, false),
        ),
      );
    for (const zone of activeZones) {
      if (excludeZoneId && zone.id === excludeZoneId) continue;
      const overlap = zone.districtCodes.some((code) =>
        districtCodes.includes(code),
      );
      if (overlap) {
        throw new ConflictException(
          `Kode kecamatan sudah dipakai zona lain: ${zone.name}`,
        );
      }
    }
  }

  async create(dto: CreateZoneDto) {
    if (dto.isFallback) {
      if (dto.districtCodes.length > 0) {
        throw new ConflictException(
          'Zona fallback tidak boleh punya district_codes',
        );
      }
      const existingFallback = await this.db.query.deliveryZones.findFirst({
        where: and(
          eq(deliveryZones.isFallback, true),
          eq(deliveryZones.isActive, true),
        ),
      });
      if (existingFallback) {
        throw new ConflictException('Sudah ada zona fallback aktif');
      }
    } else {
      if (dto.districtCodes.length === 0) {
        throw new BadRequestException(
          'district_codes wajib diisi utk zona non-fallback',
        );
      }
      await this.assertNoDistrictOverlap(dto.districtCodes);
    }

    const [zone] = await this.db
      .insert(deliveryZones)
      .values({
        name: dto.name,
        districtCodes: dto.districtCodes,
        fee: dto.fee,
        etaText: dto.etaText,
        isFallback: dto.isFallback ?? false,
      })
      .returning();
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto) {
    const existing = await this.db.query.deliveryZones.findFirst({
      where: eq(deliveryZones.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Zona tidak ditemukan');
    }
    if (dto.districtCodes) {
      await this.assertNoDistrictOverlap(dto.districtCodes, id);
    }
    const [zone] = await this.db
      .update(deliveryZones)
      .set(dto)
      .where(eq(deliveryZones.id, id))
      .returning();
    return zone;
  }

  /** Dipakai GET /delivery/fee (publik) & OrdersService saat checkout (via DI). */
  async resolveByDistrictCode(districtCode: string) {
    const activeZones = await this.db
      .select()
      .from(deliveryZones)
      .where(
        and(
          eq(deliveryZones.isActive, true),
          eq(deliveryZones.isFallback, false),
        ),
      );
    const matched = activeZones.find((z) =>
      z.districtCodes.includes(districtCode),
    );
    if (matched) {
      return {
        zone: { id: matched.id, name: matched.name, etaText: matched.etaText },
        fee: matched.fee,
        shippingMethod: 'internal' as const,
        outOfZone: false,
      };
    }

    const [fallback] = await this.db
      .select()
      .from(deliveryZones)
      .where(
        and(
          eq(deliveryZones.isActive, true),
          eq(deliveryZones.isFallback, true),
        ),
      )
      .limit(1);
    if (!fallback) {
      throw new NotFoundException('Zona fallback belum dikonfigurasi');
    }
    return {
      zone: { id: fallback.id, name: fallback.name, etaText: fallback.etaText },
      fee: fallback.fee,
      shippingMethod: 'external' as const,
      outOfZone: true,
    };
  }
}
