import { Module } from '@nestjs/common';
import { BeansModule } from './beans/beans.module';
import { MachinesModule } from './machines/machines.module';
import { GrindersModule } from './grinders/grinders.module';
import { BrandsModule } from './brands/brands.module';
import { OriginsModule } from './origins/origins.module';
import { CategoriesModule } from './categories/categories.module';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [
    BeansModule,
    MachinesModule,
    GrindersModule,
    BrandsModule,
    OriginsModule,
    CategoriesModule,
  ],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class CatalogModule {}
