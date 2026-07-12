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
import { RepairsService } from './repairs.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { parseLimit, parsePage } from '../../../common/pagination.util';
import { CreateRepairDto } from './dto/create-repair.dto';
import { UpdateRepairDto } from './dto/update-repair.dto';

@ApiTags('service-desk')
@Controller('service-desk/repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  async create(@Body() dto: CreateRepairDto, @CurrentUser() user: RequestUser) {
    return this.repairsService.create(user.id, dto);
  }

  @Roles('staff', 'admin')
  @Get('admin')
  async listAdmin(
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('page') page?: string,
  ) {
    return this.repairsService.listAdmin(
      status,
      assignedTo,
      parsePage(page),
      parseLimit(undefined),
    );
  }

  @Get()
  async listMine(@CurrentUser() user: RequestUser) {
    return this.repairsService.listMine(user.id);
  }

  @Roles('staff', 'admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRepairDto) {
    return this.repairsService.update(id, dto);
  }
}
