import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@ApiTags('catalog')
@Controller('catalog/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get()
  async findAll() {
    const data = await this.brandsService.findAllActive();
    return { data };
  }

  @Roles('staff', 'admin')
  @Post()
  async create(@Body() dto: CreateBrandDto) {
    const brand = await this.brandsService.create(dto);
    return { brand };
  }

  @Roles('staff', 'admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    const brand = await this.brandsService.update(id, dto);
    return { brand };
  }

  @Roles('staff', 'admin')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.brandsService.remove(id);
  }
}
