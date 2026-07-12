import { IsIn } from 'class-validator';

const ALLOWED_WEIGHTS = [200, 250, 500, 1000] as const;
const GRIND_TYPES = [
  'whole',
  'espresso',
  'v60',
  'french_press',
  'moka_pot',
  'drip',
] as const;

export class CreateBeanVariantDto {
  @IsIn(ALLOWED_WEIGHTS)
  weightGrams: number;

  @IsIn(GRIND_TYPES)
  grind: (typeof GRIND_TYPES)[number];
}
