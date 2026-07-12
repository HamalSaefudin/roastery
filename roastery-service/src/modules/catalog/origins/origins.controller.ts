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
import { OriginsService } from './origins.service';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateOriginDto, UpdateOriginDto } from './dto/origin.dto';

@ApiTags('catalog')
@Controller('catalog/origins')
export class OriginsController {
  constructor(private readonly originsService: OriginsService) {}

  @Public()
  @Get()
  async findAll() {
    const data = await this.originsService.findAllActive();
    return { data };
  }

  @Roles('staff', 'admin')
  @Post()
  async create(@Body() dto: CreateOriginDto) {
    const origin = await this.originsService.create(dto);
    return { origin };
  }

  @Roles('staff', 'admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOriginDto) {
    const origin = await this.originsService.update(id, dto);
    return { origin };
  }

  @Roles('staff', 'admin')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.originsService.remove(id);
  }
}
