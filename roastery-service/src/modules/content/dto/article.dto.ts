import { PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

const CONTENT_TYPES = ['brew_guide', 'blog', 'origin_story', 'page'] as const;
const CONTENT_STATUSES = ['draft', 'published'] as const;

export class CreateArticleDto {
  @IsIn(CONTENT_TYPES)
  type: (typeof CONTENT_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: (typeof CONTENT_STATUSES)[number];
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
