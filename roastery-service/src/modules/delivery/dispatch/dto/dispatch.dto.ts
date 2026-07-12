import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

const DELIVERY_STATUSES = [
  'pending',
  'assigned',
  'picked_up',
  'en_route',
  'delivered',
  'failed',
] as const;

export class AssignDeliveryDto {
  @IsUUID()
  driverId: string;

  @IsOptional()
  @IsString()
  scheduledSlot?: string;
}

export class UpdateDeliveryStatusDto {
  @IsIn(DELIVERY_STATUSES)
  status: (typeof DELIVERY_STATUSES)[number];

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateCodSettlementDto {
  @IsUUID()
  driverId: string;
}
