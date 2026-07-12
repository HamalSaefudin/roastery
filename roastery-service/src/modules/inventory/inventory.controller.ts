import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { parseLimit, parsePage } from '../../common/pagination.util';
import {
  CreateEquipmentUnitDto,
  UpdateEquipmentUnitDto,
} from './dto/equipment-unit.dto';
import { SetBeanStockDto } from './dto/set-bean-stock.dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles('staff', 'admin')
  @Get('overview')
  async overview() {
    return this.inventoryService.overview();
  }

  @Roles('staff', 'admin')
  @Get('low-stock')
  async lowStock() {
    return this.inventoryService.lowStock();
  }

  @Public()
  @Get('availability')
  async availability(
    @Query('variantId') variantId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.availability(variantId, productId);
  }

  @Roles('staff', 'admin')
  @Patch('bean-stock/:variantId')
  async setBeanStock(
    @Param('variantId') variantId: string,
    @Body() dto: SetBeanStockDto,
  ) {
    const stock = await this.inventoryService.setBeanStock(variantId, dto);
    return { stock };
  }

  @Roles('staff', 'admin')
  @Post('equipment-units')
  async createEquipmentUnit(@Body() dto: CreateEquipmentUnitDto) {
    const unit = await this.inventoryService.createEquipmentUnit(dto);
    return { unit };
  }

  @Roles('staff', 'admin')
  @Get('equipment-units')
  async listEquipmentUnits(
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.inventoryService.listEquipmentUnits({
      productId,
      status,
      page: parsePage(page),
      limit: parseLimit(undefined),
    });
  }

  @Roles('staff', 'admin')
  @Patch('equipment-units/:id')
  async updateEquipmentUnit(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentUnitDto,
  ) {
    const unit = await this.inventoryService.updateEquipmentUnitStatus(id, dto);
    return { unit };
  }
}
