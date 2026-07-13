import { INestApplication } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { products } from '../src/modules/catalog/catalog.schema';
import {
  prices,
  promoCodes,
  wholesaleTiers,
} from '../src/modules/pricing/pricing.schema';
import { createTestApp } from './utils/test-app';
import { extractCookies } from './utils/cookies';

describe('Pricing (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  const server = () => app.getHttpServer();

  const runId = Date.now();
  const password = 'password123';
  const staffEmail = `staff-pricing-e2e-${runId}@example.com`;
  const custEmail = `cust-pricing-e2e-${runId}@example.com`;
  const wsEmail = `ws-pricing-e2e-${runId}@example.com`;

  let staffCookies: string[];
  let custCookies: string[];
  let wsCookies: string[];

  let beanId: string;
  let variantId: string;
  let priceId: string;
  let tierAId: string;
  let tierBId: string;
  const promoPercent = `HEMAT10-${runId}`;
  const promoFixed = `POTONG20K-${runId}`;

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

    await request(server())
      .post('/api/auth/register')
      .send({ email: wsEmail, password })
      .expect(201);
    await db
      .update(users)
      .set({ role: 'wholesale' })
      .where(eq(users.email, wsEmail));
    const wsLogin = await request(server())
      .post('/api/auth/login')
      .send({ email: wsEmail, password })
      .expect(200);
    wsCookies = extractCookies(wsLogin);

    const beanRes = await request(server())
      .post('/api/catalog/products')
      .set('Cookie', staffCookies)
      .send({
        type: 'bean',
        name: `Pricing Test Bean ${runId}`,
        detail: { process: 'washed', roastLevel: 'light' },
      })
      .expect(201);
    beanId = beanRes.body.product.id;

    const variantRes = await request(server())
      .post(`/api/catalog/beans/${beanId}/variants`)
      .set('Cookie', staffCookies)
      .send({ weightGrams: 250, grind: 'whole' })
      .expect(201);
    variantId = variantRes.body.variant.id;
  });

  afterAll(async () => {
    if (priceId) await db.delete(prices).where(eq(prices.id, priceId));
    await db
      .delete(wholesaleTiers)
      .where(inArray(wholesaleTiers.id, [tierAId, tierBId].filter(Boolean)));
    await db
      .delete(promoCodes)
      .where(inArray(promoCodes.code, [promoPercent, promoFixed]));
    await db.delete(products).where(eq(products.id, beanId));
    await db
      .delete(users)
      .where(inArray(users.email, [staffEmail, custEmail, wsEmail]));
    await app.close();
  });

  describe('Harga retail', () => {
    it('POST tanpa isi variantId/productId -> 400', () => {
      return request(server())
        .post('/api/pricing/prices')
        .set('Cookie', staffCookies)
        .send({ price: 50000 })
        .expect(400);
    });

    it('POST isi variantId & productId sekaligus -> 400', () => {
      return request(server())
        .post('/api/pricing/prices')
        .set('Cookie', staffCookies)
        .send({ variantId, productId: beanId, price: 50000 })
        .expect(400);
    });

    it('POST tanpa login -> 401', () => {
      return request(server())
        .post('/api/pricing/prices')
        .send({ variantId, price: 85000 })
        .expect(401);
    });

    it('POST sebagai retail -> 403', () => {
      return request(server())
        .post('/api/pricing/prices')
        .set('Cookie', custCookies)
        .send({ variantId, price: 85000 })
        .expect(403);
    });

    it('POST set harga variant -> 201', async () => {
      const res = await request(server())
        .post('/api/pricing/prices')
        .set('Cookie', staffCookies)
        .send({ variantId, price: 85000 })
        .expect(201);
      priceId = res.body.price.id;
      expect(res.body.price).toMatchObject({
        variantId,
        price: 85000,
        currency: 'IDR',
      });
    });

    it('POST lagi utk variant yang sama -> 409', () => {
      return request(server())
        .post('/api/pricing/prices')
        .set('Cookie', staffCookies)
        .send({ variantId, price: 90000 })
        .expect(409);
    });

    it('PATCH harga -> 200', async () => {
      const res = await request(server())
        .patch(`/api/pricing/prices/${priceId}`)
        .set('Cookie', staffCookies)
        .send({ price: 90000 })
        .expect(200);
      expect(res.body.price.price).toBe(90000);
    });

    it('PATCH id tidak ada -> 404', () => {
      return request(server())
        .patch('/api/pricing/prices/00000000-0000-0000-0000-000000000000')
        .set('Cookie', staffCookies)
        .send({ price: 1000 })
        .expect(404);
    });
  });

  describe('GET /pricing/resolve', () => {
    it('tanpa variantId/productId -> 400', () => {
      return request(server()).get('/api/pricing/resolve').expect(400);
    });

    it('variant belum diset harga -> 404', () => {
      return request(server())
        .get('/api/pricing/resolve')
        .query({ variantId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('anonim (tanpa login) -> harga retail', async () => {
      const res = await request(server())
        .get('/api/pricing/resolve')
        .query({ variantId })
        .expect(200);
      expect(res.body).toEqual({
        price: 90000,
        currency: 'IDR',
        priceType: 'retail',
        appliedTier: null,
      });
    });

    it('wholesale tapi qty di bawah tier manapun -> tetap retail', async () => {
      const res = await request(server())
        .get('/api/pricing/resolve')
        .query({ variantId, quantity: 5 })
        .set('Cookie', wsCookies)
        .expect(200);
      expect(res.body).toMatchObject({
        priceType: 'retail',
        appliedTier: null,
      });
    });

    it('wholesale qty masuk tier A -> harga terdiskon', async () => {
      const tierARes = await request(server())
        .post('/api/pricing/wholesale-tiers')
        .set('Cookie', staffCookies)
        .send({
          name: `Grosir A ${runId}`,
          minQuantity: 10,
          discountPercent: 15,
        })
        .expect(201);
      tierAId = tierARes.body.tier.id;

      const res = await request(server())
        .get('/api/pricing/resolve')
        .query({ variantId, quantity: 10 })
        .set('Cookie', wsCookies)
        .expect(200);
      expect(res.body).toEqual({
        price: 76500, // 90000 * 0.85
        currency: 'IDR',
        priceType: 'wholesale',
        appliedTier: {
          id: tierAId,
          name: `Grosir A ${runId}`,
          discountPercent: 15,
        },
      });
    });

    it('wholesale qty masuk tier tertinggi (B) -> tier dgn min_quantity terbesar menang', async () => {
      const tierBRes = await request(server())
        .post('/api/pricing/wholesale-tiers')
        .set('Cookie', staffCookies)
        .send({
          name: `Grosir B ${runId}`,
          minQuantity: 50,
          discountPercent: 25,
        })
        .expect(201);
      tierBId = tierBRes.body.tier.id;

      const res = await request(server())
        .get('/api/pricing/resolve')
        .query({ variantId, quantity: 60 })
        .set('Cookie', wsCookies)
        .expect(200);
      expect(res.body).toEqual({
        price: 67500, // 90000 * 0.75
        currency: 'IDR',
        priceType: 'wholesale',
        appliedTier: {
          id: tierBId,
          name: `Grosir B ${runId}`,
          discountPercent: 25,
        },
      });
    });

    it('retail biasa qty tinggi tetap harga retail (tier hanya utk wholesale)', async () => {
      const res = await request(server())
        .get('/api/pricing/resolve')
        .query({ variantId, quantity: 60 })
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body).toMatchObject({
        priceType: 'retail',
        appliedTier: null,
      });
    });
  });

  describe('GET /pricing/prices & /pricing/wholesale-tiers (list utk CMS)', () => {
    it('GET /prices -> memuat harga variant dgn itemName/itemSku (join)', async () => {
      const res = await request(server())
        .get('/api/pricing/prices')
        .set('Cookie', staffCookies)
        .expect(200);
      const row = res.body.data.find((p: { id: string }) => p.id === priceId);
      expect(row).toMatchObject({
        variantId,
        itemName: `Pricing Test Bean ${runId}`,
      });
      expect(row.itemSku).toEqual(expect.stringContaining('250'));
    });

    it('GET /prices tanpa login -> 401', () => {
      return request(server()).get('/api/pricing/prices').expect(401);
    });

    it('GET /wholesale-tiers -> memuat kedua tier, urut min_quantity', async () => {
      const res = await request(server())
        .get('/api/pricing/wholesale-tiers')
        .set('Cookie', staffCookies)
        .expect(200);
      const ids = res.body.data.map((t: { id: string }) => t.id);
      expect(ids.indexOf(tierAId)).toBeLessThan(ids.indexOf(tierBId));
    });

    it('DELETE /wholesale-tiers/:id -> 204, lalu tidak muncul lagi di list', async () => {
      const tierRes = await request(server())
        .post('/api/pricing/wholesale-tiers')
        .set('Cookie', staffCookies)
        .send({
          name: `Grosir Hapus ${runId}`,
          minQuantity: 5,
          discountPercent: 5,
        })
        .expect(201);
      const tempTierId = tierRes.body.tier.id;

      await request(server())
        .delete(`/api/pricing/wholesale-tiers/${tempTierId}`)
        .set('Cookie', staffCookies)
        .expect(204);

      const res = await request(server())
        .get('/api/pricing/wholesale-tiers')
        .set('Cookie', staffCookies)
        .expect(200);
      expect(
        res.body.data.some((t: { id: string }) => t.id === tempTierId),
      ).toBe(false);
    });

    it('DELETE /wholesale-tiers/:id tidak ada -> 404', () => {
      return request(server())
        .delete(
          '/api/pricing/wholesale-tiers/00000000-0000-0000-0000-000000000000',
        )
        .set('Cookie', staffCookies)
        .expect(404);
    });

    it('DELETE /wholesale-tiers/:id sebagai retail -> 403', () => {
      return request(server())
        .delete(`/api/pricing/wholesale-tiers/${tierAId}`)
        .set('Cookie', custCookies)
        .expect(403);
    });
  });

  describe('Promo code', () => {
    it('POST promo-codes percent -> 201', async () => {
      const res = await request(server())
        .post('/api/pricing/promo-codes')
        .set('Cookie', staffCookies)
        .send({
          code: promoPercent,
          type: 'percent',
          value: 10,
          minOrder: 100000,
          maxDiscount: 50000,
        })
        .expect(201);
      expect(res.body.promo).toMatchObject({
        code: promoPercent,
        type: 'percent',
        value: 10,
        usedCount: 0,
      });
    });

    it('POST kode duplikat -> 409', () => {
      return request(server())
        .post('/api/pricing/promo-codes')
        .set('Cookie', staffCookies)
        .send({ code: promoPercent, type: 'percent', value: 5 })
        .expect(409);
    });

    it('POST percent value > 100 -> 400', () => {
      return request(server())
        .post('/api/pricing/promo-codes')
        .set('Cookie', staffCookies)
        .send({ code: `TOOMUCH-${runId}`, type: 'percent', value: 150 })
        .expect(400);
    });

    it('POST promo-codes fixed -> 201', async () => {
      await request(server())
        .post('/api/pricing/promo-codes')
        .set('Cookie', staffCookies)
        .send({ code: promoFixed, type: 'fixed', value: 20000 })
        .expect(201);
    });

    it('GET promo-codes -> memuat kedua kode', async () => {
      const res = await request(server())
        .get('/api/pricing/promo-codes')
        .set('Cookie', staffCookies)
        .expect(200);
      const codes = res.body.data.map((p: { code: string }) => p.code);
      expect(codes).toEqual(expect.arrayContaining([promoPercent, promoFixed]));
    });

    it('POST /promo/validate tanpa login -> 401', () => {
      return request(server())
        .post('/api/pricing/promo/validate')
        .send({ code: promoPercent, subtotal: 200000 })
        .expect(401);
    });

    it('validate percent normal -> discount = floor(subtotal*value/100)', async () => {
      const res = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: promoPercent, subtotal: 200000 })
        .expect(200);
      expect(res.body).toEqual({
        valid: true,
        type: 'percent',
        value: 10,
        discount: 20000,
      });
    });

    it('validate percent kena cap maxDiscount', async () => {
      const res = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: promoPercent, subtotal: 1000000 })
        .expect(200);
      expect(res.body.discount).toBe(50000);
    });

    it('validate gagal min_order', async () => {
      const res = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: promoPercent, subtotal: 50000 })
        .expect(200);
      expect(res.body).toEqual({ valid: false, reason: 'min_order' });
    });

    it('validate kode tidak ada -> not_found', async () => {
      const res = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: `TIDAKADA-${runId}`, subtotal: 200000 })
        .expect(200);
      expect(res.body).toEqual({ valid: false, reason: 'not_found' });
    });

    it('validate fixed -> discount = min(value, subtotal)', async () => {
      const res1 = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: promoFixed, subtotal: 50000 })
        .expect(200);
      expect(res1.body).toEqual({
        valid: true,
        type: 'fixed',
        value: 20000,
        discount: 20000,
      });

      const res2 = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: promoFixed, subtotal: 10000 })
        .expect(200);
      expect(res2.body.discount).toBe(10000);
    });

    it('validate inactive', async () => {
      await db
        .update(promoCodes)
        .set({ isActive: false })
        .where(eq(promoCodes.code, promoPercent));
      const res = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: promoPercent, subtotal: 200000 })
        .expect(200);
      expect(res.body).toEqual({ valid: false, reason: 'inactive' });
    });

    it('validate expired', async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await db
        .update(promoCodes)
        .set({ isActive: true, endsAt: past })
        .where(eq(promoCodes.code, promoFixed));
      const res = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: promoFixed, subtotal: 50000 })
        .expect(200);
      expect(res.body).toEqual({ valid: false, reason: 'expired' });
    });

    it('validate not_started', async () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db
        .update(promoCodes)
        .set({ endsAt: null, startsAt: future })
        .where(eq(promoCodes.code, promoFixed));
      const res = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: promoFixed, subtotal: 50000 })
        .expect(200);
      expect(res.body).toEqual({ valid: false, reason: 'not_started' });
    });

    it('validate usage_limit habis', async () => {
      await db
        .update(promoCodes)
        .set({ startsAt: null, usageLimit: 1, usedCount: 1 })
        .where(eq(promoCodes.code, promoFixed));
      const res = await request(server())
        .post('/api/pricing/promo/validate')
        .set('Cookie', custCookies)
        .send({ code: promoFixed, subtotal: 50000 })
        .expect(200);
      expect(res.body).toEqual({ valid: false, reason: 'usage_limit' });
    });
  });
});
