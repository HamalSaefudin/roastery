import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../database/drizzle.constants';
import { products } from './catalog.schema';
import { brands } from './brands/brands.schema';
import { categories } from './categories/categories.schema';

/** Kolom bersama untuk bentuk response `ProductListItem` (lihat api-contract.md). */
export const productListColumns = {
  id: products.id,
  type: products.type,
  code: products.code,
  name: products.name,
  slug: products.slug,
  description: products.description,
  imageUrl: products.imageUrl,
  isActive: products.isActive,
  brandId: brands.id,
  brandName: brands.name,
  categoryId: categories.id,
  categoryName: categories.name,
};

export type ProductListRow = {
  id: string;
  type: 'bean' | 'machine' | 'grinder';
  code: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

/** Query dasar produk + join brand/category — sub-modul tinggal tambah `.where()`. */
export function baseProductQuery(db: DrizzleDB) {
  return db
    .select(productListColumns)
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id));
}

export function mapProductListItem(row: ProductListRow) {
  return {
    id: row.id,
    type: row.type,
    code: row.code,
    name: row.name,
    slug: row.slug,
    brand: row.brandId ? { id: row.brandId, name: row.brandName } : null,
    category: row.categoryId ? { id: row.categoryId, name: row.categoryName } : null,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
  };
}
