import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePriceDto {
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsInt()
  @Min(0)
  price: number;
}

export class UpdatePriceDto {
  @IsInt()
  @Min(0)
  price: number;
}
