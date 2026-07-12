import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

const UNIT_STATUSES = ['in_stock', 'reserved', 'sold', 'defective'] as const;

export class CreateEquipmentUnitDto {
  @IsUUID()
  productId: string;

  @IsString()
  @IsNotEmpty()
  serialNumber: string;
}

export class UpdateEquipmentUnitDto {
  @IsIn(UNIT_STATUSES)
  status: (typeof UNIT_STATUSES)[number];
}
