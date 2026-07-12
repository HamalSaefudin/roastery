import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const PROMO_TYPES = ['percent', 'fixed'] as const;

export class CreatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsIn(PROMO_TYPES)
  type: (typeof PROMO_TYPES)[number];

  @IsInt()
  @Min(0)
  value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;
}
