import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { createTestApp } from './utils/test-app';

/** Ambil cookie dari response Set-Cookie, siap dipakai lagi di request berikutnya. */
function extractCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;

  const runId = Date.now();
  const email = `auth-e2e-${runId}@example.com`;
  const password = 'password123';

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<DrizzleDB>(DRIZZLE);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
    await app.close();
  });

  it('POST /api/auth/register -> 201, buat user role retail, set cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    expect(res.body.user).toMatchObject({
      email,
      role: 'retail',
      status: 'active',
    });
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookies = extractCookies(res).join(';');
    expect(cookies).toContain('access_token=');
    expect(cookies).toContain('refresh_token=');
  });

  it('POST /api/auth/register duplikat email -> 409', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(409);
  });

  it('POST /api/auth/register password < 8 char -> 400', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `short-${runId}@example.com`, password: '123' })
      .expect(400);
  });

  it('POST /api/auth/login benar -> 200 (bukan 201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    expect(res.body.user.email).toBe(email);
  });

  it('POST /api/auth/login password salah -> 401 pesan generik', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'salahbanget' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Email atau password salah');
      });
  });

  it('POST /api/auth/login email tak terdaftar -> 401 pesan SAMA (no user enumeration)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'tidak-ada@example.com', password: 'apapunitu' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Email atau password salah');
      });
  });

  it('GET /api/auth/me tanpa cookie -> 401', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('alur lengkap: login -> me -> refresh (rotasi) -> me lagi -> logout -> refresh gagal', async () => {
    const server = app.getHttpServer();

    const loginRes = await request(server)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    const loginCookies = extractCookies(loginRes);

    await request(server)
      .get('/api/auth/me')
      .set('Cookie', loginCookies)
      .expect(200);

    const refreshRes = await request(server)
      .post('/api/auth/refresh')
      .set('Cookie', loginCookies)
      .expect(200);
    expect(refreshRes.body).toEqual({ ok: true });
    const refreshedCookies = extractCookies(refreshRes);
    expect(refreshedCookies.join(';')).toContain('access_token=');

    // Refresh token LAMA sudah di-revoke oleh rotasi -> harus gagal
    await request(server)
      .post('/api/auth/refresh')
      .set('Cookie', loginCookies)
      .expect(401);

    // Cookie baru dari refresh masih valid
    await request(server)
      .get('/api/auth/me')
      .set('Cookie', refreshedCookies)
      .expect(200);

    await request(server)
      .post('/api/auth/logout')
      .set('Cookie', refreshedCookies)
      .expect(204);

    // Refresh token yang baru saja logout juga harus gagal dipakai lagi
    await request(server)
      .post('/api/auth/refresh')
      .set('Cookie', refreshedCookies)
      .expect(401);
  });

  it('status suspended: /me dgn access_token lama -> 403 (cek real-time dari DB); login -> 403', async () => {
    const server = app.getHttpServer();

    const loginRes = await request(server)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    const cookies = extractCookies(loginRes);
    await request(server)
      .get('/api/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    await db
      .update(users)
      .set({ status: 'suspended' })
      .where(eq(users.email, email));

    await request(server)
      .get('/api/auth/me')
      .set('Cookie', cookies)
      .expect(403);
    await request(server)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(403);

    // reset supaya tidak mengganggu test lain kalau suite di-rerun sebagian
    await db
      .update(users)
      .set({ status: 'active' })
      .where(eq(users.email, email));
  });
});
