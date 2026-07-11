import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { ServiceDeskModule } from './modules/service-desk/service-desk.module';
import { ContentModule } from './modules/content/content.module';
import { RegionsModule } from './modules/regions/regions.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    CustomersModule,
    CatalogModule,
    InventoryModule,
    PricingModule,
    OrdersModule,
    PaymentsModule,
    DeliveryModule,
    ServiceDeskModule,
    ContentModule,
    RegionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
