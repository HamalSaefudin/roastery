import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constants';
import type { DrizzleDB } from '../../database/drizzle.constants';
import { uniqueSlug } from '../../common/slug.util';
import { contentArticles } from './content.schema';
import type { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';

interface FindAllPublicParams {
  type?: string;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class ContentService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAllPublic(params: FindAllPublicParams) {
    const conditions: SQL[] = [eq(contentArticles.status, 'published')];
    if (params.type) {
      conditions.push(eq(contentArticles.type, params.type as 'brew_guide'));
    }
    if (params.search) {
      conditions.push(ilike(contentArticles.title, `%${params.search}%`));
    }
    const where = and(...conditions);
    const offset = (params.page - 1) * params.limit;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(contentArticles)
        .where(where)
        .orderBy(desc(contentArticles.publishedAt))
        .limit(params.limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(contentArticles)
        .where(where),
    ]);

    return { data: rows, total: totalRows[0]?.count ?? 0, page: params.page };
  }

  async findBySlug(slug: string) {
    const article = await this.db.query.contentArticles.findFirst({
      where: and(
        eq(contentArticles.slug, slug),
        eq(contentArticles.status, 'published'),
      ),
    });
    if (!article) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }
    return { article };
  }

  async create(userId: string, dto: CreateArticleDto) {
    const slug = await uniqueSlug(dto.title, async (candidate) => {
      const found = await this.db.query.contentArticles.findFirst({
        where: eq(contentArticles.slug, candidate),
      });
      return !!found;
    });
    const status = dto.status ?? 'draft';

    const [article] = await this.db
      .insert(contentArticles)
      .values({
        type: dto.type,
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        body: dto.body,
        coverImageUrl: dto.coverImageUrl,
        tags: dto.tags,
        authorId: userId,
        status,
        publishedAt: status === 'published' ? new Date() : null,
      })
      .returning();
    return { article };
  }

  async update(id: string, dto: UpdateArticleDto) {
    const existing = await this.db.query.contentArticles.findFirst({
      where: eq(contentArticles.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    const patch: Partial<typeof contentArticles.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.excerpt !== undefined) patch.excerpt = dto.excerpt;
    if (dto.body !== undefined) patch.body = dto.body;
    if (dto.coverImageUrl !== undefined)
      patch.coverImageUrl = dto.coverImageUrl;
    if (dto.tags !== undefined) patch.tags = dto.tags;
    if (dto.status !== undefined) {
      patch.status = dto.status;
      if (
        dto.status === 'published' &&
        existing.status !== 'published' &&
        !existing.publishedAt
      ) {
        patch.publishedAt = new Date();
      }
    }

    const [article] = await this.db
      .update(contentArticles)
      .set(patch)
      .where(eq(contentArticles.id, id))
      .returning();
    return { article };
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db.query.contentArticles.findFirst({
      where: eq(contentArticles.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }
    await this.db.delete(contentArticles).where(eq(contentArticles.id, id));
  }
}
