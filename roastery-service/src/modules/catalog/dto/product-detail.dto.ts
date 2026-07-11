import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const BEAN_PROCESSES = ['washed', 'natural', 'honey', 'other'] as const;
const ROAST_LEVELS = ['light', 'medium', 'dark'] as const;
const FULFILLMENT_TYPES = ['ready_stock', 'roast_to_order'] as const;

/**
 * Bentuk field `detail` gabungan (bean + machine/grinder) — divalidasi manual
 * di CatalogService sesuai `type` produk (lihat Aturan Implementasi §2).
 * Semua field opsional di level DTO karena wajib-tidaknya tergantung tipe.
 */
export class ProductDetailDto {
  // --- bean ---
  @IsOptional()
  @IsUUID()
  originId?: string;

  @IsOptional()
  @IsIn(BEAN_PROCESSES)
  process?: (typeof BEAN_PROCESSES)[number];

  @IsOptional()
  @IsIn(ROAST_LEVELS)
  roastLevel?: (typeof ROAST_LEVELS)[number];

  @IsOptional()
  @IsIn(FULFILLMENT_TYPES)
  fulfillmentType?: (typeof FULFILLMENT_TYPES)[number];

  @IsOptional()
  @IsString()
  altitude?: string;

  @IsOptional()
  @IsString()
  variety?: string;

  @IsOptional()
  @IsString()
  tastingNotes?: string;

  @IsOptional()
  @IsDateString()
  roastedAt?: string;

  // --- machine & grinder ---
  @IsOptional()
  @IsObject()
  specs?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  voltage?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyMonths?: number;

  // --- grinder only ---
  @IsOptional()
  @IsString()
  burrType?: string;
}
