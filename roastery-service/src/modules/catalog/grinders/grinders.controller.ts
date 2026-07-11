import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GrindersService } from './grinders.service';
import { Public } from '../../auth/decorators/public.decorator';
import { parseLimit, parsePage } from '../../../common/pagination.util';

@ApiTags('catalog')
@Controller('catalog/grinders')
export class GrindersController {
  constructor(private readonly grindersService: GrindersService) {}

  @Public()
  @Get()
  async findAll(
    @Query('brandId') brandId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.grindersService.listPublic({
      brandId,
      search,
      page: parsePage(page),
      limit: parseLimit(limit),
    });
  }
}
