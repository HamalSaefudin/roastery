import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ProductDetailDto } from './product-detail.dto';

const PRODUCT_TYPES = ['bean', 'machine', 'grinder'] as const;

export class CreateProductDto {
  @IsIn(PRODUCT_TYPES)
  type: (typeof PRODUCT_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateNested()
  @Type(() => ProductDetailDto)
  detail: ProductDetailDto;
}

// `type` tidak boleh diubah setelah produk dibuat.
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['type'] as const),
) {}
