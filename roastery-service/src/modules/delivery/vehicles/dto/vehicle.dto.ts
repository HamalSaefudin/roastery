import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const VEHICLE_TYPES = ['motor', 'mobil', 'van'] as const;

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @IsIn(VEHICLE_TYPES)
  type: (typeof VEHICLE_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityKg?: number;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
