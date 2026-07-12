import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ValidatePromoDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsInt()
  @Min(0)
  subtotal: number;
}
