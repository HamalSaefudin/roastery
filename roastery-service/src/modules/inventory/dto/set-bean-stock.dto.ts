import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

const STOCK_SET_REASONS = ['purchase', 'adjustment', 'return'] as const;

export class SetBeanStockDto {
  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsIn(STOCK_SET_REASONS)
  reason: (typeof STOCK_SET_REASONS)[number];
}
