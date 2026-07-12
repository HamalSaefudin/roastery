import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@ApiTags('delivery')
@Roles('staff', 'admin')
@Controller('delivery/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  async findAll() {
    const data = await this.vehiclesService.findAll();
    return { data };
  }

  @Post()
  async create(@Body() dto: CreateVehicleDto) {
    const vehicle = await this.vehiclesService.create(dto);
    return { vehicle };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    const vehicle = await this.vehiclesService.update(id, dto);
    return { vehicle };
  }
}
