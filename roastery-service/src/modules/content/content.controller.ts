import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { parseLimit, parsePage } from '../../common/pagination.util';
import { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Public()
  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.findAllPublic({
      type,
      search,
      page: parsePage(page),
      limit: parseLimit(limit),
    });
  }

  @Roles('staff', 'admin')
  @Post()
  async create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.contentService.create(user.id, dto);
  }

  @Roles('staff', 'admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.contentService.update(id, dto);
  }

  @Roles('staff', 'admin')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.contentService.remove(id);
  }

  @Public()
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.contentService.findBySlug(slug);
  }
}
