import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRepairDto {
  @IsString()
  @IsNotEmpty()
  issue: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsUUID()
  warrantyId?: string;
}
