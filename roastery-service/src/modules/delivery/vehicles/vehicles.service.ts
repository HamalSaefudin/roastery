import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { vehicles } from './vehicles.schema';
import type { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  findAll() {
    return this.db.select().from(vehicles);
  }

  async create(dto: CreateVehicleDto) {
    const existing = await this.db.query.vehicles.findFirst({
      where: eq(vehicles.plateNumber, dto.plateNumber),
    });
    if (existing) {
      throw new ConflictException('Plat nomor sudah terdaftar');
    }
    const [vehicle] = await this.db.insert(vehicles).values(dto).returning();
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const existing = await this.db.query.vehicles.findFirst({
      where: eq(vehicles.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Kendaraan tidak ditemukan');
    }
    const [vehicle] = await this.db
      .update(vehicles)
      .set(dto)
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }
}
