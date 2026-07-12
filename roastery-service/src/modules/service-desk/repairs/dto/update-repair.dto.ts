import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

const REPAIR_STATUSES = [
  'open',
  'diagnosing',
  'in_progress',
  'waiting_parts',
  'completed',
  'cancelled',
] as const;

class RepairPartDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  qty: number;
}

export class UpdateRepairDto {
  @IsOptional()
  @IsIn(REPAIR_STATUSES)
  status?: (typeof REPAIR_STATUSES)[number];

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepairPartDto)
  parts?: RepairPartDto[];
}
