import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { uniqueSlug } from '../../../common/slug.util';
import { products } from '../catalog.schema';
import { brands } from './brands.schema';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  findAllActive() {
    return this.db.select().from(brands).where(eq(brands.isActive, true));
  }

  async create(dto: CreateBrandDto) {
    const slug = await uniqueSlug(dto.name, async (candidate) => {
      const existing = await this.db.query.brands.findFirst({
        where: eq(brands.slug, candidate),
      });
      return Boolean(existing);
    });
    const [brand] = await this.db
      .insert(brands)
      .values({
        name: dto.name,
        slug,
        logoUrl: dto.logoUrl,
        description: dto.description,
      })
      .returning();
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    const existing = await this.db.query.brands.findFirst({
      where: eq(brands.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Brand tidak ditemukan');
    }
    const [updated] = await this.db
      .update(brands)
      .set(dto)
      .where(eq(brands.id, id))
      .returning();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db.query.brands.findFirst({
      where: eq(brands.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Brand tidak ditemukan');
    }
    const referenced = await this.db.query.products.findFirst({
      where: eq(products.brandId, id),
    });
    if (referenced) {
      throw new ConflictException('Masih dipakai produk');
    }
    await this.db
      .update(brands)
      .set({ isActive: false })
      .where(eq(brands.id, id));
  }
}
