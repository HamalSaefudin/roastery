import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { Public } from '../../auth/decorators/public.decorator';
import { parseLimit, parsePage } from '../../../common/pagination.util';

@ApiTags('catalog')
@Controller('catalog/machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Public()
  @Get()
  async findAll(
    @Query('brandId') brandId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.machinesService.listPublic({
      brandId,
      search,
      page: parsePage(page),
      limit: parseLimit(limit),
    });
  }
}
