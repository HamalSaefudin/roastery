import { Module } from '@nestjs/common';
import { ZonesModule } from './zones/zones.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { DriversModule } from './drivers/drivers.module';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [ZonesModule, DispatchModule, DriversModule, VehiclesModule],
  providers: [DeliveryService],
  controllers: [DeliveryController],
})
export class DeliveryModule {}
