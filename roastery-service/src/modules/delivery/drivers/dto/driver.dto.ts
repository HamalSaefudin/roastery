import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class RegisterDriverDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

export class UpdateDriverLocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
