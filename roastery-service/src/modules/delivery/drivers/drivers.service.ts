import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { users } from '../../auth/auth.schema';
import { vehicles } from '../vehicles/vehicles.schema';
import { drivers } from './drivers.schema';
import type {
  RegisterDriverDto,
  UpdateDriverLocationDto,
} from './dto/driver.dto';

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
}
