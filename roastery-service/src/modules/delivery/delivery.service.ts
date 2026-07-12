import { Injectable } from '@nestjs/common';
import { DispatchService } from './dispatch/dispatch.service';

@Injectable()
export class DeliveryService {
  constructor(private readonly dispatchService: DispatchService) {}

  trackByOrderId(orderId: string, userId: string, isStaff: boolean) {
    return this.dispatchService.trackByOrderId(orderId, userId, isStaff);
  }
}
