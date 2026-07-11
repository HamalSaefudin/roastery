import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BeansService } from './beans.service';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { parseLimit, parsePage } from '../../../common/pagination.util';
import { CreateBeanVariantDto } from './dto/bean-variant.dto';

@ApiTags('catalog')
@Controller('catalog/beans')
export class BeansController {
  constructor(private readonly beansService: BeansService) {}

  @Public()
  @Get()
  async findAll(
    @Query('originId') originId?: string,
    @Query('process') process?: string,
    @Query('roastLevel') roastLevel?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.beansService.listPublic({
      originId,
      process,
      roastLevel,
      search,
      page: parsePage(page),
      limit: parseLimit(limit),
    });
  }

  @Roles('staff', 'admin')
  @Post(':id/variants')
  async createVariant(@Param('id') productId: string, @Body() dto: CreateBeanVariantDto) {
    const variant = await this.beansService.createVariant(productId, dto);
    return { variant };
  }
}
