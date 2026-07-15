import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { users } from '../../auth/auth.schema';
import { vehicles } from '../vehicles/vehicles.schema';
import { deliveries } from '../dispatch/dispatch.schema';
import { drivers } from './drivers.schema';
import type {
  RegisterDriverDto,
  UpdateDriverLocationDto,
} from './dto/driver.dto';

const ACTIVE_DELIVERY_STATUSES = ['assigned', 'picked_up', 'en_route'] as const;

@Injectable()
export class DriversService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async register(dto: RegisterDriverDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, dto.userId),
    });
    if (!user || user.role !== 'driver') {
      throw new BadRequestException('User harus terdaftar dengan role driver');
    }
    const existing = await this.db.query.drivers.findFirst({
      where: eq(drivers.userId, dto.userId),
    });
    if (existing) {
      throw new ConflictException('User ini sudah terdaftar sebagai driver');
    }
    if (dto.vehicleId) {
      const vehicle = await this.db.query.vehicles.findFirst({
        where: eq(vehicles.id, dto.vehicleId),
      });
      if (!vehicle) {
        throw new NotFoundException('Kendaraan tidak ditemukan');
      }
    }

    const [driver] = await this.db
      .insert(drivers)
      .values({
        userId: dto.userId,
        name: dto.name,
        phone: dto.phone,
        vehicleId: dto.vehicleId,
      })
      .returning();
    return this.mapWithVehicle(driver);
  }

  private async mapWithVehicle(driver: typeof drivers.$inferSelect) {
    if (!driver.vehicleId) {
      return { id: driver.id, name: driver.name, vehicle: null };
    }
    const vehicle = await this.db.query.vehicles.findFirst({
      where: eq(vehicles.id, driver.vehicleId),
    });
    return {
      id: driver.id,
      name: driver.name,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            plateNumber: vehicle.plateNumber,
            type: vehicle.type,
          }
        : null,
    };
  }

  async findByUserId(userId: string) {
    const driver = await this.db.query.drivers.findFirst({
      where: eq(drivers.userId, userId),
    });
    if (!driver) {
      throw new NotFoundException('Profil driver tidak ditemukan');
    }
    return driver;
  }

  async updateLocation(
    userId: string,
    dto: UpdateDriverLocationDto,
  ): Promise<void> {
    const driver = await this.findByUserId(userId);
    await this.db
      .update(drivers)
      .set({ currentLat: dto.lat, currentLng: dto.lng, updatedAt: new Date() })
      .where(eq(drivers.id, driver.id));
  }

  /** Dipakai CMS staff (halaman Driver step 09) — list lengkap + beban aktif. */
  async listDrivers() {
    const rows = await this.db.select().from(drivers);
    return Promise.all(rows.map((d) => this.mapDriverFull(d)));
  }

  async updateAvailability(id: string, isAvailable: boolean) {
    const existing = await this.db.query.drivers.findFirst({
      where: eq(drivers.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Driver tidak ditemukan');
    }
    const [updated] = await this.db
      .update(drivers)
      .set({ isAvailable, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    return this.mapDriverFull(updated);
  }

  private async mapDriverFull(driver: typeof drivers.$inferSelect) {
    const [vehicle, activeRow] = await Promise.all([
      driver.vehicleId
        ? this.db.query.vehicles.findFirst({
            where: eq(vehicles.id, driver.vehicleId),
          })
        : Promise.resolve(null),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(deliveries)
        .where(
          and(
            eq(deliveries.driverId, driver.id),
            inArray(deliveries.status, [...ACTIVE_DELIVERY_STATUSES]),
          ),
        ),
    ]);
    return {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      isAvailable: driver.isAvailable,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            plateNumber: vehicle.plateNumber,
            type: vehicle.type,
          }
        : null,
      activeJobs: activeRow[0]?.count ?? 0,
    };
  }
}
