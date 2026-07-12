import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const FULFILLMENT_METHODS = ['delivery', 'pickup'] as const;
const PAYMENT_METHODS = ['online', 'cod'] as const;

export class CheckoutDto {
  @IsIn(FULFILLMENT_METHODS)
  fulfillmentMethod: (typeof FULFILLMENT_METHODS)[number];

  @IsIn(PAYMENT_METHODS)
  paymentMethod: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsUUID()
  addressId?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
