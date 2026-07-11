import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  line1: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @IsNotEmpty()
  provinceCode: string;

  @IsString()
  @IsNotEmpty()
  regencyCode: string;

  @IsString()
  @IsNotEmpty()
  districtCode: string;

  // Wajib diisi (meski kolom DB nullable) — postal_code cuma bisa diturunkan dari sini.
  @IsString()
  @IsNotEmpty()
  villageCode: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
