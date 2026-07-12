import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('track/:orderId')
  async track(
    @Param('orderId') orderId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const isStaff = user.role === 'staff' || user.role === 'admin';
    return this.deliveryService.trackByOrderId(orderId, user.id, isStaff);
  }
}
