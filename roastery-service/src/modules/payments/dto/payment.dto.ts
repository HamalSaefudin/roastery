import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

const PAYMENT_METHODS = ['qris', 'va', 'ewallet'] as const;

export class CreatePaymentCheckoutDto {
  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  method?: (typeof PAYMENT_METHODS)[number];
}

export class RefundDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
