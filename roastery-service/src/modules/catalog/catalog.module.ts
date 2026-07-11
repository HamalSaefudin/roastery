import { Module } from '@nestjs/common';
import { BeansModule } from './beans/beans.module';
import { MachinesModule } from './machines/machines.module';
import { GrindersModule } from './grinders/grinders.module';

@Module({
  imports: [BeansModule, MachinesModule, GrindersModule]
})
export class CatalogModule {}
