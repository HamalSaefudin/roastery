import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterWarrantyDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;
}
