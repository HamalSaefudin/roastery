import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateWholesaleTierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  minQuantity: number;

  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent: number;
}
