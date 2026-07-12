import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CreatePaymentCheckoutDto, RefundDto } from './dto/payment.dto';
import { CreateInvoiceDto } from './dto/invoice.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  async checkout(
    @Body() dto: CreatePaymentCheckoutDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.paymentsService.checkout(dto.orderId, dto, user.id);
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
  ) {
    return this.paymentsService.handleWebhook(headers, body);
  }

  @Get('order/:orderId')
  async getByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const isStaff = user.role === 'staff' || user.role === 'admin';
    const payment = await this.paymentsService.getByOrderId(
      orderId,
      user.id,
      isStaff,
    );
    return { payment };
  }

  @Roles('staff', 'admin')
  @Post(':id/refund')
  async refund(@Param('id') id: string, @Body() dto: RefundDto) {
    return this.paymentsService.refund(id, dto);
  }

  @Roles('staff', 'admin')
  @Post('invoices')
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    const invoice = await this.paymentsService.createInvoice(dto);
    return { invoice };
  }

  @Roles('staff', 'admin')
  @Patch('invoices/:id/pay')
  async payInvoice(@Param('id') id: string) {
    const invoice = await this.paymentsService.payInvoice(id);
    return { invoice };
  }
}
