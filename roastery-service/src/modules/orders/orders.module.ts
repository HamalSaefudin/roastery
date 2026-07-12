import { forwardRef, Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { PricingModule } from '../pricing/pricing.module';
import { ZonesModule } from '../delivery/zones/zones.module';
import { PaymentsModule } from '../payments/payments.module';
import { DispatchModule } from '../delivery/dispatch/dispatch.module';

@Module({
  imports: [
    InventoryModule,
    PricingModule,
    ZonesModule,
    forwardRef(() => PaymentsModule),
    forwardRef(() => DispatchModule),
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
