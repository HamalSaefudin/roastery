import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constants';
import type { DrizzleDB } from '../../database/drizzle.constants';
import { nextCode } from '../../common/sequence.util';
import { uniqueSlug } from '../../common/slug.util';
import { products } from './catalog.schema';
import { brands } from './brands/brands.schema';
import { categories } from './categories/categories.schema';
import { origins } from './origins/origins.schema';
import { baseProductQuery, mapProductListItem, productListColumns } from './catalog.query';
import type { ProductListRow } from './catalog.query';
import { beanDetails, beanVariants } from './beans/beans.schema';
import { machineDetails } from './machines/machines.schema';
import { grinderDetails } from './grinders/grinders.schema';
import type { ProductDetailDto } from './dto/product-detail.dto';
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto';

const CODE_PREFIX: Record<string, string> = { bean: 'BEN', machine: 'MCH', grinder: 'GRD' };

interface FindAllProductsParams {
  type?: string;
  brandId?: string;
  categoryId?: string;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class CatalogService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAllProducts(params: FindAllProductsParams) {
    const conditions: SQL[] = [eq(products.isActive, true)];
    if (params.type) {
      conditions.push(eq(products.type, params.type as 'bean'));
    }
    if (params.brandId) {
      conditions.push(eq(products.brandId, params.brandId));
    }
    if (params.categoryId) {
      conditions.push(eq(products.categoryId, params.categoryId));
    }
    if (params.search) {
      conditions.push(ilike(products.name, `%${params.search}%`));
    }
    const where = and(...conditions);
    const offset = (params.page - 1) * params.limit;

    const [rows, totalRows] = await Promise.all([
      baseProductQuery(this.db).where(where).limit(params.limit).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
    ]);

    return {
      data: rows.map((r) => mapProductListItem(r)),
      total: totalRows[0]?.count ?? 0,
      page: params.page,
      limit: params.limit,
    };
  }

  async findBySlug(slug: string) {
    const [row] = await this.db
      .select(productListColumns)
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.slug, slug), eq(products.isActive, true)));
    if (!row) {
      throw new NotFoundException('Produk tidak ditemukan');
    }
    return { product: await this.buildDetail(row) };
  }

  async createProduct(dto: CreateProductDto) {
    this.validateDetail(dto.type, dto.brandId, dto.detail);

    const productId = await this.db.transaction(async (tx) => {
      const code = await nextCode(tx, {
        prefix: CODE_PREFIX[dto.type],
        scope: 'global',
        width: 6,
        counter: `product_${dto.type}`,
      });
      const slug = await uniqueSlug(dto.name, async (candidate) => {
        const found = await tx.query.products.findFirst({ where: eq(products.slug, candidate) });
        return !!found;
      });

      const [product] = await tx
        .insert(products)
        .values({
          type: dto.type,
          code,
          name: dto.name,
          slug,
          description: dto.description,
          brandId: dto.brandId,
          categoryId: dto.categoryId,
          imageUrl: dto.imageUrl,
          isActive: dto.isActive ?? true,
        })
        .returning();

      if (dto.type === 'bean') {
        await tx.insert(beanDetails).values({
          productId: product.id,
          originId: dto.detail.originId,
          process: dto.detail.process!,
          roastLevel: dto.detail.roastLevel!,
          fulfillmentType: dto.detail.fulfillmentType ?? 'ready_stock',
          altitude: dto.detail.altitude,
          variety: dto.detail.variety,
          tastingNotes: dto.detail.tastingNotes,
          roastedAt: dto.detail.roastedAt,
        });
      } else if (dto.type === 'machine') {
        await tx.insert(machineDetails).values({
          productId: product.id,
          specs: dto.detail.specs,
          voltage: dto.detail.voltage,
          warrantyMonths: dto.detail.warrantyMonths!,
        });
      } else {
        await tx.insert(grinderDetails).values({
          productId: product.id,
          burrType: dto.detail.burrType!,
          specs: dto.detail.specs,
          warrantyMonths: dto.detail.warrantyMonths!,
        });
      }

      return product.id;
    });

    return { product: await this.assembleById(productId) };
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.db.query.products.findFirst({ where: eq(products.id, id) });
    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    await this.db.transaction(async (tx) => {
      const productPatch: Partial<typeof products.$inferInsert> = {};
      if (dto.name !== undefined) productPatch.name = dto.name;
      if (dto.description !== undefined) productPatch.description = dto.description;
      if (dto.brandId !== undefined) productPatch.brandId = dto.brandId;
      if (dto.categoryId !== undefined) productPatch.categoryId = dto.categoryId;
      if (dto.imageUrl !== undefined) productPatch.imageUrl = dto.imageUrl;
      if (dto.isActive !== undefined) productPatch.isActive = dto.isActive;
      if (Object.keys(productPatch).length > 0) {
        productPatch.updatedAt = new Date();
        await tx.update(products).set(productPatch).where(eq(products.id, id));
      }

      if (dto.detail) {
        if (existing.type === 'bean') {
          const patch: Partial<typeof beanDetails.$inferInsert> = {};
          if (dto.detail.originId !== undefined) patch.originId = dto.detail.originId;
          if (dto.detail.process !== undefined) patch.process = dto.detail.process;
          if (dto.detail.roastLevel !== undefined) patch.roastLevel = dto.detail.roastLevel;
          if (dto.detail.fulfillmentType !== undefined) patch.fulfillmentType = dto.detail.fulfillmentType;
          if (dto.detail.altitude !== undefined) patch.altitude = dto.detail.altitude;
          if (dto.detail.variety !== undefined) patch.variety = dto.detail.variety;
          if (dto.detail.tastingNotes !== undefined) patch.tastingNotes = dto.detail.tastingNotes;
          if (dto.detail.roastedAt !== undefined) patch.roastedAt = dto.detail.roastedAt;
          if (Object.keys(patch).length > 0) {
            await tx.update(beanDetails).set(patch).where(eq(beanDetails.productId, id));
          }
        } else if (existing.type === 'machine') {
          const patch: Partial<typeof machineDetails.$inferInsert> = {};
          if (dto.detail.specs !== undefined) patch.specs = dto.detail.specs;
          if (dto.detail.voltage !== undefined) patch.voltage = dto.detail.voltage;
          if (dto.detail.warrantyMonths !== undefined) patch.warrantyMonths = dto.detail.warrantyMonths;
          if (Object.keys(patch).length > 0) {
            await tx.update(machineDetails).set(patch).where(eq(machineDetails.productId, id));
          }
        } else {
          const patch: Partial<typeof grinderDetails.$inferInsert> = {};
          if (dto.detail.burrType !== undefined) patch.burrType = dto.detail.burrType;
          if (dto.detail.specs !== undefined) patch.specs = dto.detail.specs;
          if (dto.detail.warrantyMonths !== undefined) patch.warrantyMonths = dto.detail.warrantyMonths;
          if (Object.keys(patch).length > 0) {
            await tx.update(grinderDetails).set(patch).where(eq(grinderDetails.productId, id));
          }
        }
      }
    });

    return { product: await this.assembleById(id) };
  }

  async removeProduct(id: string) {
    const existing = await this.db.query.products.findFirst({ where: eq(products.id, id) });
    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }
    await this.db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  private validateDetail(type: string, brandId: string | undefined, detail: ProductDetailDto) {
    if (type === 'bean') {
      if (!detail.process || !detail.roastLevel) {
        throw new BadRequestException(
          'detail.process dan detail.roastLevel wajib diisi untuk produk bean',
        );
      }
      return;
    }
    if (!brandId) {
      throw new BadRequestException('brandId wajib diisi untuk produk machine/grinder');
    }
    if (detail.warrantyMonths === undefined) {
      throw new BadRequestException('detail.warrantyMonths wajib diisi');
    }
    if (type === 'grinder' && !detail.burrType) {
      throw new BadRequestException('detail.burrType wajib diisi untuk produk grinder');
    }
  }

  private async assembleById(id: string) {
    const [row] = await this.db
      .select(productListColumns)
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id));
    if (!row) {
      throw new NotFoundException('Produk tidak ditemukan');
    }
    return this.buildDetail(row);
  }

  private async buildDetail(row: ProductListRow) {
    const base = {
      id: row.id,
      type: row.type,
      code: row.code,
      name: row.name,
      slug: row.slug,
      description: row.description,
      brand: row.brandId ? { id: row.brandId, name: row.brandName } : null,
      category: row.categoryId ? { id: row.categoryId, name: row.categoryName } : null,
      imageUrl: row.imageUrl,
      isActive: row.isActive,
    };

    if (row.type === 'bean') {
      const [detailRow] = await this.db
        .select({
          originId: origins.id,
          originName: origins.name,
          originCountry: origins.country,
          process: beanDetails.process,
          roastLevel: beanDetails.roastLevel,
          fulfillmentType: beanDetails.fulfillmentType,
          altitude: beanDetails.altitude,
          variety: beanDetails.variety,
          tastingNotes: beanDetails.tastingNotes,
          roastedAt: beanDetails.roastedAt,
        })
        .from(beanDetails)
        .leftJoin(origins, eq(beanDetails.originId, origins.id))
        .where(eq(beanDetails.productId, row.id));

      const variants = await this.db
        .select({
          id: beanVariants.id,
          weightGrams: beanVariants.weightGrams,
          grind: beanVariants.grind,
          sku: beanVariants.sku,
          isActive: beanVariants.isActive,
        })
        .from(beanVariants)
        .where(eq(beanVariants.productId, row.id));

      return {
        ...base,
        detail: {
          origin: detailRow?.originId
            ? { id: detailRow.originId, name: detailRow.originName, country: detailRow.originCountry }
            : null,
          process: detailRow?.process ?? null,
          roastLevel: detailRow?.roastLevel ?? null,
          fulfillmentType: detailRow?.fulfillmentType ?? null,
          altitude: detailRow?.altitude ?? null,
          variety: detailRow?.variety ?? null,
          tastingNotes: detailRow?.tastingNotes ?? null,
          roastedAt: detailRow?.roastedAt ?? null,
          variants,
        },
      };
    }

    if (row.type === 'machine') {
      const [detailRow] = await this.db
        .select({
          specs: machineDetails.specs,
          voltage: machineDetails.voltage,
          warrantyMonths: machineDetails.warrantyMonths,
        })
        .from(machineDetails)
        .where(eq(machineDetails.productId, row.id));
      return { ...base, detail: detailRow ?? null };
    }

    const [detailRow] = await this.db
      .select({
        burrType: grinderDetails.burrType,
        specs: grinderDetails.specs,
        warrantyMonths: grinderDetails.warrantyMonths,
      })
      .from(grinderDetails)
      .where(eq(grinderDetails.productId, row.id));
    return { ...base, detail: detailRow ?? null };
  }
}
