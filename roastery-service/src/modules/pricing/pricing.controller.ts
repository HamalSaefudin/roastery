import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CreatePriceDto, UpdatePriceDto } from './dto/price.dto';
import { CreateWholesaleTierDto } from './dto/wholesale-tier.dto';
import { CreatePromoCodeDto } from './dto/promo-code.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Public()
  @Get('resolve')
  async resolve(
    @CurrentUser() user: RequestUser | undefined,
    @Query('variantId') variantId?: string,
    @Query('productId') productId?: string,
    @Query('quantity') quantity?: string,
  ) {
    return this.pricingService.resolvePrice({
      variantId,
      productId,
      quantity: quantity ? parseInt(quantity, 10) : 1,
      isWholesale: user?.role === 'wholesale',
    });
  }

  @Post('promo/validate')
  @HttpCode(200)
  async validatePromo(@Body() dto: ValidatePromoDto) {
    return this.pricingService.validatePromo(dto.code, dto.subtotal);
  }

  @Roles('staff', 'admin')
  @Post('prices')
  async createPrice(@Body() dto: CreatePriceDto) {
    const price = await this.pricingService.createPrice(dto);
    return { price };
  }

  @Roles('staff', 'admin')
  @Patch('prices/:id')
  async updatePrice(@Param('id') id: string, @Body() dto: UpdatePriceDto) {
    const price = await this.pricingService.updatePrice(id, dto);
    return { price };
  }

  @Roles('staff', 'admin')
  @Post('wholesale-tiers')
  async createWholesaleTier(@Body() dto: CreateWholesaleTierDto) {
    const tier = await this.pricingService.createWholesaleTier(dto);
    return { tier };
  }

  @Roles('staff', 'admin')
  @Post('promo-codes')
  async createPromoCode(@Body() dto: CreatePromoCodeDto) {
    const promo = await this.pricingService.createPromoCode(dto);
    return { promo };
  }

  @Roles('staff', 'admin')
  @Get('promo-codes')
  async listPromoCodes() {
    const data = await this.pricingService.listPromoCodes();
    return { data };
  }
}
