import { IsDateString, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  orderId: string;

  @IsDateString()
  dueDate: string;
}
