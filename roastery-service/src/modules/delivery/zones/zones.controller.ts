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
import { ZonesService } from './zones.service';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

@ApiTags('delivery')
@Controller('delivery')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Public()
  @Get('zones')
  async findAll() {
    const data = await this.zonesService.findAllActive();
    return { data };
  }

  @Roles('staff', 'admin')
  @Post('zones')
  async create(@Body() dto: CreateZoneDto) {
    const zone = await this.zonesService.create(dto);
    return { zone };
  }

  @Roles('staff', 'admin')
  @Patch('zones/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    const zone = await this.zonesService.update(id, dto);
    return { zone };
  }

  @Public()
  @Get('fee')
  async resolveFee(@Query('districtCode') districtCode: string) {
    const result = await this.zonesService.resolveByDistrictCode(districtCode);
    return {
      zoneId: result.zone.id,
      fee: result.fee,
      etaText: result.zone.etaText,
      shippingMethod: result.shippingMethod,
      outOfZone: result.outOfZone,
    };
  }
}
