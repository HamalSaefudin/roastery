import { INestApplication } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { products } from '../src/modules/catalog/catalog.schema';
import { brands } from '../src/modules/catalog/brands/brands.schema';
import { origins } from '../src/modules/catalog/origins/origins.schema';
import { categories } from '../src/modules/catalog/categories/categories.schema';
import { createTestApp } from './utils/test-app';
import { extractCookies } from './utils/cookies';

describe('Catalog (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  const server = () => app.getHttpServer();

  const runId = Date.now();
  const password = 'password123';
  const staffEmail = `staff-catalog-e2e-${runId}@example.com`;
  const custEmail = `cust-catalog-e2e-${runId}@example.com`;

  let staffCookies: string[];
  let custCookies: string[];

  let brandId: string;
  let brandId2: string;
  let originId: string;
  let categoryId: string;

  let beanId: string;
  let beanSlug: string;
  let machineId: string;
  let grinderId: string;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<DrizzleDB>(DRIZZLE);

    await request(server()).post('/api/auth/register').send({ email: staffEmail, password }).expect(201);
    await db.update(users).set({ role: 'staff' }).where(eq(users.email, staffEmail));
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
    await db.delete(products).where(inArray(products.id, [beanId, machineId, grinderId].filter(Boolean)));
    await db.delete(brands).where(inArray(brands.id, [brandId, brandId2].filter(Boolean)));
    if (originId) await db.delete(origins).where(eq(origins.id, originId));
    if (categoryId) await db.delete(categories).where(eq(categories.id, categoryId));
    await db.delete(users).where(inArray(users.email, [staffEmail, custEmail]));
    await app.close();
  });

  describe('Master data — brands', () => {
    it('POST tanpa login -> 401', () => {
      return request(server()).post('/api/catalog/brands').send({ name: 'Rocket' }).expect(401);
    });

    it('POST sebagai retail -> 403', () => {
      return request(server())
        .post('/api/catalog/brands')
        .set('Cookie', custCookies)
        .send({ name: 'Rocket' })
        .expect(403);
    });

    it('POST sebagai staff -> 201, slug auto', async () => {
      const res = await request(server())
        .post('/api/catalog/brands')
        .set('Cookie', staffCookies)
        .send({ name: `Rocket Espresso ${runId}`, description: 'Italia' })
        .expect(201);
      brandId = res.body.brand.id;
      expect(res.body.brand.slug).toBe(`rocket-espresso-${runId}`);
      expect(res.body.brand.isActive).toBe(true);
    });

    it('POST nama sama -> 201, slug dapat suffix -2', async () => {
      const res = await request(server())
        .post('/api/catalog/brands')
        .set('Cookie', staffCookies)
        .send({ name: `Rocket Espresso ${runId}` })
        .expect(201);
      brandId2 = res.body.brand.id;
      expect(res.body.brand.slug).toBe(`rocket-espresso-${runId}-2`);
    });

    it('GET publik -> memuat brand yang dibuat', async () => {
      const res = await request(server()).get('/api/catalog/brands').expect(200);
      expect(res.body.data.some((b: { id: string }) => b.id === brandId)).toBe(true);
    });

    it('PATCH -> 200', async () => {
      const res = await request(server())
        .patch(`/api/catalog/brands/${brandId}`)
        .set('Cookie', staffCookies)
        .send({ description: 'Italia, dual boiler' })
        .expect(200);
      expect(res.body.brand.description).toBe('Italia, dual boiler');
    });

    it('DELETE brand yang belum dipakai produk -> 204', async () => {
      await request(server())
        .delete(`/api/catalog/brands/${brandId2}`)
        .set('Cookie', staffCookies)
        .expect(204);
    });
  });

  describe('Master data — origins & categories', () => {
    it('POST origin -> 201', async () => {
      const res = await request(server())
        .post('/api/catalog/origins')
        .set('Cookie', staffCookies)
        .send({ name: `Ethiopia Yirgacheffe ${runId}`, country: 'Ethiopia', region: 'Yirgacheffe' })
        .expect(201);
      originId = res.body.origin.id;
    });

    it('POST category -> 201, slug auto', async () => {
      const res = await request(server())
        .post('/api/catalog/categories')
        .set('Cookie', staffCookies)
        .send({ name: `Manual Brew ${runId}` })
        .expect(201);
      categoryId = res.body.category.id;
      expect(res.body.category.parentId).toBeNull();
    });

    it('GET categories publik -> memuat category yang dibuat', async () => {
      const res = await request(server()).get('/api/catalog/categories').expect(200);
      expect(res.body.data.some((c: { id: string }) => c.id === categoryId)).toBe(true);
    });
  });

  describe('Produk — create (validasi per tipe)', () => {
    it('POST bean tanpa process/roastLevel -> 400', () => {
      return request(server())
        .post('/api/catalog/products')
        .set('Cookie', staffCookies)
        .send({ type: 'bean', name: `Bean Invalid ${runId}`, detail: {} })
        .expect(400);
    });

    it('POST bean lengkap (tanpa brandId) -> 201, code BEN-xxxxxx', async () => {
      const res = await request(server())
        .post('/api/catalog/products')
        .set('Cookie', staffCookies)
        .send({
          type: 'bean',
          name: `Ethiopia Yirgacheffe ${runId}`,
          description: 'Floral dan citrusy',
          categoryId,
          detail: {
            originId,
            process: 'washed',
            roastLevel: 'light',
            altitude: '1900-2100 mdpl',
            variety: 'Heirloom',
            tastingNotes: 'floral, lemon',
          },
        })
        .expect(201);
      beanId = res.body.product.id;
      beanSlug = res.body.product.slug;
      expect(res.body.product.code).toMatch(/^BEN-\d{6}$/);
      expect(res.body.product.brand).toBeNull();
      expect(res.body.product.detail.origin.id).toBe(originId);
      expect(res.body.product.detail.fulfillmentType).toBe('ready_stock');
      expect(res.body.product.detail.variants).toEqual([]);
    });

    it('POST machine tanpa brandId -> 400', () => {
      return request(server())
        .post('/api/catalog/products')
        .set('Cookie', staffCookies)
        .send({ type: 'machine', name: `Machine Invalid ${runId}`, detail: { warrantyMonths: 12 } })
        .expect(400);
    });

    it('POST machine lengkap -> 201, code MCH-xxxxxx', async () => {
      const res = await request(server())
        .post('/api/catalog/products')
        .set('Cookie', staffCookies)
        .send({
          type: 'machine',
          name: `Rocket Appartamento ${runId}`,
          brandId,
          detail: { warrantyMonths: 12, voltage: '220V', specs: { boiler: 'dual' } },
        })
        .expect(201);
      machineId = res.body.product.id;
      expect(res.body.product.code).toMatch(/^MCH-\d{6}$/);
      expect(res.body.product.brand.id).toBe(brandId);
      expect(res.body.product.detail.warrantyMonths).toBe(12);
    });

    it('POST grinder tanpa burrType -> 400', () => {
      return request(server())
        .post('/api/catalog/products')
        .set('Cookie', staffCookies)
        .send({
          type: 'grinder',
          name: `Grinder Invalid ${runId}`,
          brandId,
          detail: { warrantyMonths: 24 },
        })
        .expect(400);
    });

    it('POST grinder lengkap -> 201, code GRD-xxxxxx', async () => {
      const res = await request(server())
        .post('/api/catalog/products')
        .set('Cookie', staffCookies)
        .send({
          type: 'grinder',
          name: `Eureka Mignon ${runId}`,
          brandId,
          detail: { warrantyMonths: 24, burrType: 'flat' },
        })
        .expect(201);
      grinderId = res.body.product.id;
      expect(res.body.product.code).toMatch(/^GRD-\d{6}$/);
      expect(res.body.product.detail.burrType).toBe('flat');
    });

    it('POST produk tanpa login -> 401', () => {
      return request(server())
        .post('/api/catalog/products')
        .send({ type: 'bean', name: 'X', detail: { process: 'washed', roastLevel: 'light' } })
        .expect(401);
    });

    it('POST produk sebagai retail -> 403', () => {
      return request(server())
        .post('/api/catalog/products')
        .set('Cookie', custCookies)
        .send({ type: 'bean', name: 'X', detail: { process: 'washed', roastLevel: 'light' } })
        .expect(403);
    });
  });

  describe('Produk — read publik', () => {
    it('GET /catalog/products -> memuat ketiga tipe', async () => {
      const res = await request(server()).get('/api/catalog/products').expect(200);
      const ids = res.body.data.map((p: { id: string }) => p.id);
      expect(ids).toEqual(expect.arrayContaining([beanId, machineId, grinderId]));
    });

    it('GET /catalog/products?type=machine -> hanya machine', async () => {
      const res = await request(server()).get('/api/catalog/products').query({ type: 'machine' }).expect(200);
      expect(res.body.data.every((p: { type: string }) => p.type === 'machine')).toBe(true);
      expect(res.body.data.some((p: { id: string }) => p.id === machineId)).toBe(true);
    });

    it('GET /catalog/products/:slug -> detail bean lengkap', async () => {
      const res = await request(server()).get(`/api/catalog/products/${beanSlug}`).expect(200);
      expect(res.body.product.id).toBe(beanId);
      expect(res.body.product.detail.process).toBe('washed');
    });

    it('GET /catalog/products/:slug tidak ada -> 404', () => {
      return request(server()).get('/api/catalog/products/slug-tidak-ada').expect(404);
    });

    it('GET /catalog/beans?originId= -> filter sesuai origin', async () => {
      const res = await request(server()).get('/api/catalog/beans').query({ originId }).expect(200);
      expect(res.body.data.some((p: { id: string }) => p.id === beanId)).toBe(true);
    });

    it('GET /catalog/machines?brandId= -> filter sesuai brand', async () => {
      const res = await request(server()).get('/api/catalog/machines').query({ brandId }).expect(200);
      expect(res.body.data.some((p: { id: string }) => p.id === machineId)).toBe(true);
    });

    it('GET /catalog/grinders?brandId= -> filter sesuai brand', async () => {
      const res = await request(server()).get('/api/catalog/grinders').query({ brandId }).expect(200);
      expect(res.body.data.some((p: { id: string }) => p.id === grinderId)).toBe(true);
    });
  });

  describe('Produk — update & delete', () => {
    it('PATCH produk -> 200, ubah description & detail', async () => {
      const res = await request(server())
        .patch(`/api/catalog/products/${beanId}`)
        .set('Cookie', staffCookies)
        .send({ description: 'Update deskripsi', detail: { tastingNotes: 'floral, jasmine' } })
        .expect(200);
      expect(res.body.product.description).toBe('Update deskripsi');
      expect(res.body.product.detail.tastingNotes).toBe('floral, jasmine');
    });

    it('DELETE brand yang masih dipakai produk -> 409', () => {
      return request(server())
        .delete(`/api/catalog/brands/${brandId}`)
        .set('Cookie', staffCookies)
        .expect(409);
    });

    it('DELETE produk -> 204, soft delete', async () => {
      await request(server())
        .delete(`/api/catalog/products/${grinderId}`)
        .set('Cookie', staffCookies)
        .expect(204);

      await request(server()).get(`/api/catalog/products/${beanSlug}`).expect(200);
    });

    it('produk nonaktif tidak muncul lagi di publik', async () => {
      const grinder = await db.query.products.findFirst({ where: eq(products.id, grinderId) });
      const res = await request(server()).get(`/api/catalog/products/${grinder!.slug}`).expect(404);
      expect(res.body.message).toBe('Produk tidak ditemukan');

      const listRes = await request(server()).get('/api/catalog/products').expect(200);
      expect(listRes.body.data.some((p: { id: string }) => p.id === grinderId)).toBe(false);
    });
  });

  describe('Varian bean', () => {
    it('POST variant -> 201, sku auto-generate', async () => {
      const res = await request(server())
        .post(`/api/catalog/beans/${beanId}/variants`)
        .set('Cookie', staffCookies)
        .send({ weightGrams: 250, grind: 'v60' })
        .expect(201);
      expect(res.body.variant.sku).toMatch(/^BEN-\d{6}-250-V60$/);
    });

    it('POST variant duplikat berat+giling -> 409', () => {
      return request(server())
        .post(`/api/catalog/beans/${beanId}/variants`)
        .set('Cookie', staffCookies)
        .send({ weightGrams: 250, grind: 'v60' })
        .expect(409);
    });

    it('POST variant weightGrams di luar daftar -> 400', () => {
      return request(server())
        .post(`/api/catalog/beans/${beanId}/variants`)
        .set('Cookie', staffCookies)
        .send({ weightGrams: 300, grind: 'whole' })
        .expect(400);
    });

    it('POST variant untuk produk non-bean -> 404', () => {
      return request(server())
        .post(`/api/catalog/beans/${machineId}/variants`)
        .set('Cookie', staffCookies)
        .send({ weightGrams: 200, grind: 'whole' })
        .expect(404);
    });

    it('GET detail bean setelah variant -> variants terisi', async () => {
      const res = await request(server()).get(`/api/catalog/products/${beanSlug}`).expect(200);
      expect(res.body.product.detail.variants).toHaveLength(1);
      expect(res.body.product.detail.variants[0].sku).toMatch(/^BEN-\d{6}-250-V60$/);
    });
  });
});
