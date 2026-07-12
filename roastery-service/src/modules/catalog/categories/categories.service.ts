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
import { categories } from './categories.schema';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  findAllActive() {
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true));
  }

  async create(dto: CreateCategoryDto) {
    const slug = await uniqueSlug(dto.name, async (candidate) => {
      const existing = await this.db.query.categories.findFirst({
        where: eq(categories.slug, candidate),
      });
      return Boolean(existing);
    });
    const [category] = await this.db
      .insert(categories)
      .values({ name: dto.name, slug, parentId: dto.parentId })
      .returning();
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }
    const [updated] = await this.db
      .update(categories)
      .set(dto)
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }
    const referencedByProduct = await this.db.query.products.findFirst({
      where: eq(products.categoryId, id),
    });
    if (referencedByProduct) {
      throw new ConflictException('Masih dipakai produk');
    }
    const hasChild = await this.db.query.categories.findFirst({
      where: eq(categories.parentId, id),
    });
    if (hasChild) {
      throw new ConflictException('Masih punya sub-kategori');
    }
    await this.db
      .update(categories)
      .set({ isActive: false })
      .where(eq(categories.id, id));
  }
}
