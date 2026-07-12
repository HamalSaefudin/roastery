import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const ORDER_STATUSES = [
  'created',
  'paid',
  'processing',
  'out_for_delivery',
  'ready_for_pickup',
  'delivered',
  'cancelled',
] as const;

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status: (typeof ORDER_STATUSES)[number];

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateShippingDto {
  @IsString()
  @IsNotEmpty()
  courierName: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}
