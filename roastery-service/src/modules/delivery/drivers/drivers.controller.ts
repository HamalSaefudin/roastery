import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { RegisterDriverDto, UpdateDriverLocationDto } from './dto/driver.dto';

@ApiTags('delivery')
@Controller('delivery')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Roles('staff', 'admin')
  @Post('drivers')
  async register(@Body() dto: RegisterDriverDto) {
    const driver = await this.driversService.register(dto);
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
