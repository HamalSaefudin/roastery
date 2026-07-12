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
import { DispatchService } from './dispatch.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import {
  AssignDeliveryDto,
  CreateCodSettlementDto,
  UpdateDeliveryStatusDto,
} from './dto/dispatch.dto';

@ApiTags('delivery')
@Controller('delivery')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Roles('staff', 'admin')
  @Get('dispatch')
  async board(@Query('status') status?: string) {
    const data = await this.dispatchService.listDispatchBoard(status);
    return { data };
  }

  @Roles('staff', 'admin')
  @Post(':id/assign')
  @HttpCode(200)
  async assign(@Param('id') id: string, @Body() dto: AssignDeliveryDto) {
    const delivery = await this.dispatchService.assign(id, dto);
    return { delivery };
  }

  @Roles('driver')
  @Get('driver/jobs')
  async driverJobs(@CurrentUser() user: RequestUser) {
    const data = await this.dispatchService.listDriverJobs(user.id);
    return { data };
  }

  @Roles('driver')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    const delivery = await this.dispatchService.updateStatus(id, user.id, dto);
    return { delivery };
  }

  @Roles('driver')
  @Post(':id/cod-collect')
  @HttpCode(200)
  async codCollect(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const delivery = await this.dispatchService.codCollect(id, user.id);
    return { delivery };
  }

  @Roles('driver')
  @Get('driver/cod-balance')
  async codBalance(@CurrentUser() user: RequestUser) {
    return this.dispatchService.driverCodBalance(user.id);
  }

  @Roles('staff', 'admin')
  @Post('cod-settlements')
  async createSettlement(@Body() dto: CreateCodSettlementDto) {
    const settlement = await this.dispatchService.createCodSettlement(dto);
    return { settlement };
  }

  @Roles('staff', 'admin')
  @Patch('cod-settlements/:id/confirm')
  async confirmSettlement(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const settlement = await this.dispatchService.confirmCodSettlement(
      id,
      user.id,
    );
    return { settlement };
  }
}
