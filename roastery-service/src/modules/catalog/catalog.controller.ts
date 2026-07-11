import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { parseLimit, parsePage } from '../../common/pagination.util';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@ApiTags('catalog')
@Controller('catalog/products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('brandId') brandId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.findAllProducts({
      type,
      brandId,
      categoryId,
      search,
      page: parsePage(page),
      limit: parseLimit(limit),
    });
  }

  @Public()
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.catalogService.findBySlug(slug);
  }

  @Roles('staff', 'admin')
  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @Roles('staff', 'admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalogService.updateProduct(id, dto);
  }

  @Roles('staff', 'admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.catalogService.removeProduct(id);
  }
}
