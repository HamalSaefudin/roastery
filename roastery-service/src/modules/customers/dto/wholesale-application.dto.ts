import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateWholesaleApplicationDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsOptional()
  @IsString()
  taxId?: string;
}

export class DecideWholesaleApplicationDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  // Wajib diisi kalau decision = reject (Aturan Implementasi §6).
  @ValidateIf((o: DecideWholesaleApplicationDto) => o.decision === 'reject')
  @IsString()
  @IsNotEmpty()
  note?: string;
}
