import { forwardRef, Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchController } from './dispatch.controller';
import { OrdersModule } from '../../orders/orders.module';
import { PaymentsModule } from '../../payments/payments.module';

@Module({
  imports: [forwardRef(() => OrdersModule), PaymentsModule],
  providers: [DispatchService],
  controllers: [DispatchController],
  exports: [DispatchService],
})
export class DispatchModule {}
