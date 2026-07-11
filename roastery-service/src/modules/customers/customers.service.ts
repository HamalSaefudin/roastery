import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constants';
import type { DrizzleDB } from '../../database/drizzle.constants';
import { nextCode } from '../../common/sequence.util';
import { users } from '../auth/auth.schema';
import {
  districts,
  provinces,
  regencies,
  villages,
} from '../regions/regions.schema';
import {
  addresses,
  customerProfiles,
  wholesaleApplications,
} from './customers.schema';
import type { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type {
  CreateWholesaleApplicationDto,
  DecideWholesaleApplicationDto,
} from './dto/wholesale-application.dto';

type CustomerProfile = typeof customerProfiles.$inferSelect;

interface RegionChain {
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
  villageCode: string;
  postalCode: string | null;
}

const addressColumns = {
  id: addresses.id,
  label: addresses.label,
  recipientName: addresses.recipientName,
  phone: addresses.phone,
  line1: addresses.line1,
  line2: addresses.line2,
  postalCode: addresses.postalCode,
  isDefault: addresses.isDefault,
  provinceCode: addresses.provinceCode,
  provinceName: provinces.name,
  regencyCode: addresses.regencyCode,
  regencyName: regencies.name,
  districtCode: addresses.districtCode,
  districtName: districts.name,
  villageCode: addresses.villageCode,
  villageName: villages.name,
};

type AddressRow = Awaited<
  ReturnType<CustomersService['selectAddressRows']>
>[number];

@Injectable()
export class CustomersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ---------- Profil ----------

  async getOrCreateProfile(userId: string): Promise<CustomerProfile> {
    const existing = await this.db.query.customerProfiles.findFirst({
      where: eq(customerProfiles.userId, userId),
    });
    if (existing) {
      return existing;
    }

    const created = await this.db.transaction(async (tx) => {
      const code = await nextCode(tx, {
        prefix: 'CUS',
        scope: 'global',
        width: 6,
        counter: 'customer',
      });
      const rows = await tx
        .insert(customerProfiles)
        .values({ userId, code, fullName: '', customerType: 'retail' })
        .onConflictDoNothing({ target: customerProfiles.userId })
        .returning();
      return rows[0];
    });
    if (created) {
      return created;
    }

    // Race: profil dibuat request lain di antara cek & insert — ambil yang sudah ada.
    const profile = await this.db.query.customerProfiles.findFirst({
      where: eq(customerProfiles.userId, userId),
    });
    if (!profile) {
      throw new Error('Gagal membuat/mengambil profil customer');
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<CustomerProfile> {
    const profile = await this.getOrCreateProfile(userId);
    const [updated] = await this.db
      .update(customerProfiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(customerProfiles.id, profile.id))
      .returning();
    return updated;
  }

  // ---------- Alamat ----------

  private selectAddressRows() {
    return this.db
      .select(addressColumns)
      .from(addresses)
      .innerJoin(provinces, eq(addresses.provinceCode, provinces.code))
      .innerJoin(regencies, eq(addresses.regencyCode, regencies.code))
      .innerJoin(districts, eq(addresses.districtCode, districts.code))
      .leftJoin(villages, eq(addresses.villageCode, villages.code));
  }

  private mapAddressRow(row: AddressRow) {
    return {
      id: row.id,
      label: row.label,
      recipientName: row.recipientName,
      phone: row.phone,
      line1: row.line1,
      line2: row.line2,
      province: { code: row.provinceCode, name: row.provinceName },
      regency: { code: row.regencyCode, name: row.regencyName },
      district: { code: row.districtCode, name: row.districtName },
      village: row.villageCode
        ? { code: row.villageCode, name: row.villageName }
        : null,
      postalCode: row.postalCode,
      isDefault: row.isDefault,
    };
  }

  async listAddresses(customerId: string) {
    const rows = await this.selectAddressRows()
      .where(eq(addresses.customerId, customerId))
      .orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
    return rows.map((r) => this.mapAddressRow(r));
  }

  /** Validasi kode wilayah berjenjang konsisten (lihat Aturan Implementasi §3) + ambil postal code. */
  private async validateRegionChain(chain: {
    provinceCode: string;
    regencyCode: string;
    districtCode: string;
    villageCode: string;
  }): Promise<string> {
    const rows = await this.db
      .select({
        villageCode: villages.code,
        districtCode: districts.code,
        regencyCode: regencies.code,
        provinceCode: provinces.code,
        postalCode: villages.postalCode,
      })
      .from(villages)
      .innerJoin(districts, eq(villages.districtCode, districts.code))
      .innerJoin(regencies, eq(districts.regencyCode, regencies.code))
      .innerJoin(provinces, eq(regencies.provinceCode, provinces.code))
      .where(eq(villages.code, chain.villageCode));

    const found: RegionChain | undefined = rows[0];
    if (!found) {
      throw new BadRequestException('villageCode tidak valid');
    }
    if (
      found.districtCode !== chain.districtCode ||
      found.regencyCode !== chain.regencyCode ||
      found.provinceCode !== chain.provinceCode
    ) {
      throw new BadRequestException(
        'Kode wilayah tidak konsisten — provinsi/kab-kota/kecamatan/kelurahan harus berjenjang',
      );
    }
    if (!found.postalCode) {
      throw new BadRequestException(
        'Kelurahan ini tidak punya kode pos terdaftar',
      );
    }
    return found.postalCode;
  }

  private async unsetOtherDefaults(tx: DrizzleDB, customerId: string) {
    await tx
      .update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.customerId, customerId));
  }

  async createAddress(customerId: string, dto: CreateAddressDto) {
    const postalCode = await this.validateRegionChain(dto);

    const created = await this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.customerId, customerId));
      const isFirst = existing.length === 0;

      if (dto.isDefault || isFirst) {
        await this.unsetOtherDefaults(tx, customerId);
      }

      const [row] = await tx
        .insert(addresses)
        .values({
          customerId,
          label: dto.label,
          recipientName: dto.recipientName,
          phone: dto.phone,
          line1: dto.line1,
          line2: dto.line2,
          provinceCode: dto.provinceCode,
          regencyCode: dto.regencyCode,
          districtCode: dto.districtCode,
          villageCode: dto.villageCode,
          postalCode,
          isDefault: Boolean(dto.isDefault) || isFirst,
        })
        .returning();
      return row;
    });

    const rows = await this.selectAddressRows().where(
      eq(addresses.id, created.id),
    );
    return this.mapAddressRow(rows[0]);
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const existing = await this.db.query.addresses.findFirst({
      where: and(
        eq(addresses.id, addressId),
        eq(addresses.customerId, customerId),
      ),
    });
    if (!existing) {
      throw new NotFoundException('Alamat tidak ditemukan');
    }

    const regionTouched = Boolean(
      dto.provinceCode ||
      dto.regencyCode ||
      dto.districtCode ||
      dto.villageCode,
    );
    let postalCode = existing.postalCode;
    const merged = {
      provinceCode: dto.provinceCode ?? existing.provinceCode,
      regencyCode: dto.regencyCode ?? existing.regencyCode,
      districtCode: dto.districtCode ?? existing.districtCode,
      villageCode: dto.villageCode ?? existing.villageCode ?? '',
    };
    if (regionTouched) {
      postalCode = await this.validateRegionChain(merged);
    }

    await this.db.transaction(async (tx) => {
      if (dto.isDefault) {
        await this.unsetOtherDefaults(tx, customerId);
      }
      await tx
        .update(addresses)
        .set({
          ...(dto.label !== undefined && { label: dto.label }),
          ...(dto.recipientName !== undefined && {
            recipientName: dto.recipientName,
          }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.line1 !== undefined && { line1: dto.line1 }),
          ...(dto.line2 !== undefined && { line2: dto.line2 }),
          ...(regionTouched && { ...merged, postalCode }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        })
        .where(eq(addresses.id, addressId));
    });

    const rows = await this.selectAddressRows().where(
      eq(addresses.id, addressId),
    );
    return this.mapAddressRow(rows[0]);
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    const existing = await this.db.query.addresses.findFirst({
      where: and(
        eq(addresses.id, addressId),
        eq(addresses.customerId, customerId),
      ),
    });
    if (!existing) {
      throw new NotFoundException('Alamat tidak ditemukan');
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(addresses).where(eq(addresses.id, addressId));
      if (existing.isDefault) {
        const remaining = await tx
          .select({ id: addresses.id })
          .from(addresses)
          .where(eq(addresses.customerId, customerId))
          .orderBy(asc(addresses.createdAt))
          .limit(1);
        if (remaining[0]) {
          await tx
            .update(addresses)
            .set({ isDefault: true })
            .where(eq(addresses.id, remaining[0].id));
        }
      }
    });
  }

  // ---------- Wholesale ----------

  async createWholesaleApplication(
    customerId: string,
    dto: CreateWholesaleApplicationDto,
  ) {
    const profile = await this.db.query.customerProfiles.findFirst({
      where: eq(customerProfiles.id, customerId),
    });
    if (profile?.customerType === 'wholesale') {
      throw new ConflictException('Sudah wholesale');
    }

    const pending = await this.db.query.wholesaleApplications.findFirst({
      where: and(
        eq(wholesaleApplications.customerId, customerId),
        eq(wholesaleApplications.status, 'pending'),
      ),
    });
    if (pending) {
      throw new ConflictException('Sudah ada pengajuan yang masih diproses');
    }

    const [application] = await this.db
      .insert(wholesaleApplications)
      .values({ customerId, businessName: dto.businessName, taxId: dto.taxId })
      .returning();
    return application;
  }

  async getMyWholesaleApplication(customerId: string) {
    const application = await this.db.query.wholesaleApplications.findFirst({
      where: eq(wholesaleApplications.customerId, customerId),
      orderBy: desc(wholesaleApplications.createdAt),
    });
    return application ?? null;
  }

  async listCustomers(params: {
    search?: string;
    type?: 'retail' | 'wholesale';
    page: number;
    limit: number;
  }) {
    const conditions: SQL[] = [];
    if (params.type) {
      conditions.push(eq(customerProfiles.customerType, params.type));
    }
    if (params.search) {
      // or() dengan 2 argumen literal tidak pernah undefined di runtime.
      conditions.push(
        or(
          ilike(customerProfiles.fullName, `%${params.search}%`),
          ilike(customerProfiles.code, `%${params.search}%`),
        )!,
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.limit;

    const [data, totalRows] = await Promise.all([
      this.db
        .select()
        .from(customerProfiles)
        .where(where)
        .orderBy(desc(customerProfiles.createdAt))
        .limit(params.limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(customerProfiles)
        .where(where),
    ]);

    return { data, total: totalRows[0]?.count ?? 0, page: params.page };
  }

  async listWholesaleApplications(
    status?: 'pending' | 'approved' | 'rejected',
  ) {
    const where = status ? eq(wholesaleApplications.status, status) : undefined;
    return this.db
      .select()
      .from(wholesaleApplications)
      .where(where)
      .orderBy(desc(wholesaleApplications.createdAt));
  }

  async decideWholesaleApplication(
    applicationId: string,
    staffUserId: string,
    dto: DecideWholesaleApplicationDto,
  ) {
    const application = await this.db.query.wholesaleApplications.findFirst({
      where: eq(wholesaleApplications.id, applicationId),
    });
    if (!application) {
      throw new NotFoundException('Pengajuan tidak ditemukan');
    }
    if (application.status !== 'pending') {
      throw new ConflictException('Pengajuan sudah diproses');
    }

    return this.db.transaction(async (tx) => {
      const newStatus = dto.decision === 'approve' ? 'approved' : 'rejected';
      const [updated] = await tx
        .update(wholesaleApplications)
        .set({
          status: newStatus,
          note: dto.note,
          reviewedBy: staffUserId,
          reviewedAt: new Date(),
        })
        .where(eq(wholesaleApplications.id, applicationId))
        .returning();

      if (dto.decision === 'approve') {
        const profile = await tx.query.customerProfiles.findFirst({
          where: eq(customerProfiles.id, application.customerId),
        });
        await tx
          .update(customerProfiles)
          .set({ customerType: 'wholesale' })
          .where(eq(customerProfiles.id, application.customerId));
        if (profile) {
          await tx
            .update(users)
            .set({ role: 'wholesale' })
            .where(eq(users.id, profile.userId));
        }
      }

      return updated;
    });
  }
}
