import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import {
  RegisterDriverDto,
  UpdateDriverAvailabilityDto,
  UpdateDriverLocationDto,
} from './dto/driver.dto';

@ApiTags('delivery')
@Controller('delivery')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Roles('staff', 'admin')
  @Get('drivers')
  async list() {
    const data = await this.driversService.listDrivers();
    return { data };
  }

  @Roles('staff', 'admin')
  @Post('drivers')
  async register(@Body() dto: RegisterDriverDto) {
    const driver = await this.driversService.register(dto);
    return { driver };
  }

  @Roles('staff', 'admin')
  @Patch('drivers/:id')
  async updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateDriverAvailabilityDto,
  ) {
    const driver = await this.driversService.updateAvailability(
      id,
      dto.isAvailable,
    );
    return { driver };
  }

  @Roles('driver')
  @Post('driver/location')
  @HttpCode(204)
  async updateLocation(
    @Body() dto: UpdateDriverLocationDto,
    @CurrentUser() user: RequestUser,
  ) {
    await this.driversService.updateLocation(user.id, dto);
  }
}
