import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { parseLimit, parsePage } from '../../common/pagination.util';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart-item.dto';
import { CheckoutDto } from './dto/checkout.dto';
import {
  UpdateOrderStatusDto,
  UpdateShippingDto,
} from './dto/order-status.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private isWholesale(user: RequestUser): boolean {
    return user.role === 'wholesale';
  }

  @Get('cart')
  async getCart(@CurrentUser() user: RequestUser) {
    return this.ordersService.getCart(user.id, this.isWholesale(user));
  }

  @Post('cart/items')
  async addCartItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.addCartItem(user.id, dto, this.isWholesale(user));
  }

  @Patch('cart/items/:id')
  async updateCartItem(
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.updateCartItem(
      user.id,
      id,
      dto,
      this.isWholesale(user),
    );
  }

  @Delete('cart/items/:id')
  async removeCartItem(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.removeCartItem(
      user.id,
      id,
      this.isWholesale(user),
    );
  }

  @Post('checkout')
  async checkout(@Body() dto: CheckoutDto, @CurrentUser() user: RequestUser) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Roles('staff', 'admin')
  @Get('admin')
  async listAdmin(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.ordersService.listAdmin(
      status,
      search,
      parsePage(page),
      parseLimit(undefined),
    );
  }

  @Get()
  async listMine(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.ordersService.listMine(
      user.id,
      status,
      parsePage(page),
      parseLimit(undefined),
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const isStaff = user.role === 'staff' || user.role === 'admin';
    return this.ordersService.getById(user.id, id, isStaff);
  }

  @Roles('staff', 'admin')
  @Patch(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    const order = await this.ordersService.changeStatus(
      id,
      dto.status,
      user.id,
      dto.note,
    );
    return { order };
  }

  @Roles('staff', 'admin')
  @Patch(':id/shipping')
  async updateShipping(
    @Param('id') id: string,
    @Body() dto: UpdateShippingDto,
  ) {
    return this.ordersService.updateShipping(id, dto);
  }
}
