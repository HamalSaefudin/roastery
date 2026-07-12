import { INestApplication } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { contentArticles } from '../src/modules/content/content.schema';
import { createTestApp } from './utils/test-app';
import { extractCookies } from './utils/cookies';

describe('Content (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  const server = () => app.getHttpServer();

  const runId = Date.now();
  const password = 'password123';
  const staffEmail = `staff-content-e2e-${runId}@example.com`;
  const custEmail = `cust-content-e2e-${runId}@example.com`;

  let staffCookies: string[];
  let custCookies: string[];
  let articleId: string;
  let articleSlug: string;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<DrizzleDB>(DRIZZLE);

    await request(server())
      .post('/api/auth/register')
      .send({ email: staffEmail, password })
      .expect(201);
    await db
      .update(users)
      .set({ role: 'staff' })
      .where(eq(users.email, staffEmail));
    const staffLogin = await request(server())
      .post('/api/auth/login')
      .send({ email: staffEmail, password })
      .expect(200);
    staffCookies = extractCookies(staffLogin);

    const custRes = await request(server())
      .post('/api/auth/register')
      .send({ email: custEmail, password })
      .expect(201);
    custCookies = extractCookies(custRes);
  });

  afterAll(async () => {
    await db
      .delete(contentArticles)
      .where(eq(contentArticles.type, 'brew_guide'));
    await db.delete(users).where(inArray(users.email, [staffEmail, custEmail]));
    await app.close();
  });

  describe('Admin CRUD', () => {
    it('retail tidak bisa POST -> 403', () => {
      return request(server())
        .post('/api/content')
        .set('Cookie', custCookies)
        .send({ type: 'blog', title: 'Coba', body: 'isi' })
        .expect(403);
    });

    it('POST tanpa login -> 401', () => {
      return request(server())
        .post('/api/content')
        .send({ type: 'blog', title: 'Coba', body: 'isi' })
        .expect(401);
    });

    it('POST draft -> 201, slug auto dari title', async () => {
      const res = await request(server())
        .post('/api/content')
        .set('Cookie', staffCookies)
        .send({
          type: 'brew_guide',
          title: `Cara Seduh V60 ${runId}`,
          excerpt: 'Panduan singkat',
          body: 'Langkah 1: panaskan air',
          tags: ['v60', 'manual brew'],
        })
        .expect(201);
      expect(res.body.article.status).toBe('draft');
      expect(res.body.article.publishedAt).toBeNull();
      expect(res.body.article.slug).toBe(`cara-seduh-v60-${runId}`);
      articleId = res.body.article.id;
      articleSlug = res.body.article.slug;
    });

    it('POST title sama -> 201, slug dapat suffix -2 (bukan 409)', async () => {
      const res = await request(server())
        .post('/api/content')
        .set('Cookie', staffCookies)
        .send({
          type: 'brew_guide',
          title: `Cara Seduh V60 ${runId}`,
          body: 'Versi lain',
        })
        .expect(201);
      expect(res.body.article.slug).toBe(`cara-seduh-v60-${runId}-2`);
      await db
        .delete(contentArticles)
        .where(eq(contentArticles.id, res.body.article.id));
    });

    it('PATCH artikel tidak ada -> 404', () => {
      return request(server())
        .patch('/api/content/00000000-0000-0000-0000-000000000000')
        .set('Cookie', staffCookies)
        .send({ title: 'x' })
        .expect(404);
    });
  });

  describe('Draft vs published visibility', () => {
    it('draft tidak muncul di GET /content publik', async () => {
      const res = await request(server())
        .get('/api/content')
        .query({ type: 'brew_guide' })
        .expect(200);
      expect(
        res.body.data.some((a: { id: string }) => a.id === articleId),
      ).toBe(false);
    });

    it('GET /content/:slug utk draft -> 404', () => {
      return request(server()).get(`/api/content/${articleSlug}`).expect(404);
    });

    let firstPublishedAt: string;

    it('PATCH publish -> published_at terisi, muncul publik', async () => {
      const res = await request(server())
        .patch(`/api/content/${articleId}`)
        .set('Cookie', staffCookies)
        .send({ status: 'published' })
        .expect(200);
      expect(res.body.article.status).toBe('published');
      expect(res.body.article.publishedAt).not.toBeNull();
      firstPublishedAt = res.body.article.publishedAt;

      const listRes = await request(server())
        .get('/api/content')
        .query({ type: 'brew_guide' })
        .expect(200);
      expect(
        listRes.body.data.some((a: { id: string }) => a.id === articleId),
      ).toBe(true);

      const detailRes = await request(server())
        .get(`/api/content/${articleSlug}`)
        .expect(200);
      expect(detailRes.body.article.id).toBe(articleId);
    });

    it('unpublish lalu publish lagi -> published_at TIDAK berubah', async () => {
      await request(server())
        .patch(`/api/content/${articleId}`)
        .set('Cookie', staffCookies)
        .send({ status: 'draft' })
        .expect(200);
      const res = await request(server())
        .patch(`/api/content/${articleId}`)
        .set('Cookie', staffCookies)
        .send({ status: 'published' })
        .expect(200);
      expect(res.body.article.publishedAt).toBe(firstPublishedAt);
    });

    it('search filter by title -> memuat artikel', async () => {
      const res = await request(server())
        .get('/api/content')
        .query({ search: `V60 ${runId}` })
        .expect(200);
      expect(
        res.body.data.some((a: { id: string }) => a.id === articleId),
      ).toBe(true);
    });

    it('filter type lain -> tidak memuat artikel ini', async () => {
      const res = await request(server())
        .get('/api/content')
        .query({ type: 'blog' })
        .expect(200);
      expect(
        res.body.data.some((a: { id: string }) => a.id === articleId),
      ).toBe(false);
    });
  });

  describe('Delete', () => {
    it('retail tidak bisa DELETE -> 403', () => {
      return request(server())
        .delete(`/api/content/${articleId}`)
        .set('Cookie', custCookies)
        .expect(403);
    });

    it('DELETE -> 204, lalu 404', async () => {
      await request(server())
        .delete(`/api/content/${articleId}`)
        .set('Cookie', staffCookies)
        .expect(204);
      await request(server()).get(`/api/content/${articleSlug}`).expect(404);
      await request(server())
        .patch(`/api/content/${articleId}`)
        .set('Cookie', staffCookies)
        .send({ title: 'x' })
        .expect(404);
    });
  });
});
