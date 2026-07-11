import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { beanDetails } from '../beans/beans.schema';
import { origins } from './origins.schema';
import type { CreateOriginDto, UpdateOriginDto } from './dto/origin.dto';

@Injectable()
export class OriginsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  findAllActive() {
    return this.db.select().from(origins).where(eq(origins.isActive, true));
  }

  async create(dto: CreateOriginDto) {
    const [origin] = await this.db.insert(origins).values(dto).returning();
    return origin;
  }

  async update(id: string, dto: UpdateOriginDto) {
    const existing = await this.db.query.origins.findFirst({ where: eq(origins.id, id) });
    if (!existing) {
      throw new NotFoundException('Origin tidak ditemukan');
    }
    const [updated] = await this.db
      .update(origins)
      .set(dto)
      .where(eq(origins.id, id))
      .returning();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db.query.origins.findFirst({ where: eq(origins.id, id) });
    if (!existing) {
      throw new NotFoundException('Origin tidak ditemukan');
    }
    const referenced = await this.db.query.beanDetails.findFirst({
      where: eq(beanDetails.originId, id),
    });
    if (referenced) {
      throw new ConflictException('Masih dipakai produk');
    }
    await this.db.update(origins).set({ isActive: false }).where(eq(origins.id, id));
  }
}
