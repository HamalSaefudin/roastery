import { Module } from '@nestjs/common';
import { ZonesModule } from './zones/zones.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { DriversModule } from './drivers/drivers.module';

@Module({
  imports: [ZonesModule, DispatchModule, DriversModule]
})
export class DeliveryModule {}
