import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // Kosong hanya boleh kalau isFallback=true (zona fallback tidak punya district_codes).
  @IsArray()
  @IsString({ each: true })
  districtCodes: string[];

  @IsInt()
  @Min(0)
  fee: number;

  @IsOptional()
  @IsString()
  etaText?: string;

  @IsOptional()
  @IsBoolean()
  isFallback?: boolean;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  districtCodes?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  fee?: number;

  @IsOptional()
  @IsString()
  etaText?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
