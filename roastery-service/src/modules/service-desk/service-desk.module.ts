import { Module } from '@nestjs/common';
import { WarrantyModule } from './warranty/warranty.module';
import { RepairsModule } from './repairs/repairs.module';

@Module({
  imports: [WarrantyModule, RepairsModule],
})
export class ServiceDeskModule {}
