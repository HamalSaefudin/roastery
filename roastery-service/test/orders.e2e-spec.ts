import { INestApplication } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { products } from '../src/modules/catalog/catalog.schema';
import { promoCodes } from '../src/modules/pricing/pricing.schema';
import { deliveryZones } from '../src/modules/delivery/zones/zones.schema';
import { createTestApp } from './utils/test-app';
import { extractCookies } from './utils/cookies';

const REGION = {
  provinceCode: '32',
  regencyCode: '32.73',
  districtCode: '32.73.01',
  villageCode: '32.73.01.1001',
};
const OOZ_REGION = {
  provinceCode: '11',
  regencyCode: '11.01',
  districtCode: '11.01.01',
  villageCode: '11.01.01.2015',
};

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  const server = () => app.getHttpServer();

  const runId = Date.now();
  const password = 'password123';
  const staffEmail = `staff-orders-e2e-${runId}@example.com`;
  const custEmail = `cust-orders-e2e-${runId}@example.com`;

  let staffCookies: string[];
  let custCookies: string[];

  let beanId: string;
  let variantId: string;
  let addressId: string;
  let oozAddressId: string;
  let zoneId: string;
  let fallbackZoneId: string;
  let itemId: string;
  const promoCode = `ORDPROMO-${runId}`;

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
    // Trigger auto-create customer_profiles (real frontend calls this on login/app-load).
    await request(server())
      .get('/api/customers/me')
      .set('Cookie', custCookies)
      .expect(200);

    const beanRes = await request(server())
      .post('/api/catalog/products')
      .set('Cookie', staffCookies)
      .send({
        type: 'bean',
        name: `Orders Test Bean ${runId}`,
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

    await request(server())
      .post('/api/pricing/prices')
      .set('Cookie', staffCookies)
      .send({ variantId, price: 40000 })
      .expect(201);
    await request(server())
      .patch(`/api/inventory/bean-stock/${variantId}`)
      .set('Cookie', staffCookies)
      .send({ quantity: 50, reason: 'purchase' })
      .expect(200);

    const zoneRes = await request(server())
      .post('/api/delivery/zones')
      .set('Cookie', staffCookies)
      .send({
        name: `Zona Orders ${runId}`,
        districtCodes: [REGION.districtCode],
        fee: 12000,
      })
      .expect(201);
    zoneId = zoneRes.body.zone.id;
    const fallbackRes = await request(server())
      .post('/api/delivery/zones')
      .set('Cookie', staffCookies)
      .send({
        name: `Fallback Orders ${runId}`,
        districtCodes: [],
        fee: 30000,
        isFallback: true,
      })
      .expect(201);
    fallbackZoneId = fallbackRes.body.zone.id;

    const addrRes = await request(server())
      .post('/api/customers/me/addresses')
      .set('Cookie', custCookies)
      .send({
        label: 'Rumah',
        recipientName: 'Budi',
        phone: '08111',
        line1: 'Jl. A',
        ...REGION,
      })
      .expect(201);
    addressId = addrRes.body.address.id;

    const oozAddrRes = await request(server())
      .post('/api/customers/me/addresses')
      .set('Cookie', custCookies)
      .send({
        label: 'LuarZona',
        recipientName: 'Budi',
        phone: '08111',
        line1: 'Jl. B',
        ...OOZ_REGION,
      })
      .expect(201);
    oozAddressId = oozAddrRes.body.address.id;

    await request(server())
      .post('/api/pricing/promo-codes')
      .set('Cookie', staffCookies)
      .send({ code: promoCode, type: 'fixed', value: 5000 })
      .expect(201);
  });

  afterAll(async () => {
    await db.delete(products).where(eq(products.id, beanId));
    // users -> customer_profiles -> orders -> deliveries semua cascade, jadi harus lebih dulu
    // dari delivery_zones (deliveries.zone_id belum punya onDelete rule).
    await db.delete(users).where(inArray(users.email, [staffEmail, custEmail]));
    await db
      .delete(deliveryZones)
      .where(inArray(deliveryZones.id, [zoneId, fallbackZoneId]));
    await db.delete(promoCodes).where(eq(promoCodes.code, promoCode));
    await app.close();
  });

  describe('Cart', () => {
    it('GET cart kosong -> subtotal 0', async () => {
      const res = await request(server())
        .get('/api/orders/cart')
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body.cart).toMatchObject({ items: [], subtotal: 0 });
    });

    it('POST cart/items tanpa variantId/productId -> 400', () => {
      return request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ quantity: 1 })
        .expect(400);
    });

    it('POST cart/items variant tidak ada -> 404', () => {
      return request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({
          variantId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        })
        .expect(404);
    });

    it('POST cart/items melebihi stok -> 409', () => {
      return request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 999 })
        .expect(409);
    });

    it('POST cart/items -> 201, tambah item lagi jumlahkan qty', async () => {
      const res1 = await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 2 })
        .expect(201);
      expect(res1.body.cart.items[0]).toMatchObject({
        quantity: 2,
        unitPrice: 40000,
        lineTotal: 80000,
      });

      const res2 = await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      expect(res2.body.cart.items[0].quantity).toBe(3);
      itemId = res2.body.cart.items[0].id;
    });

    it('PATCH cart/items/:id -> 200', async () => {
      const res = await request(server())
        .patch(`/api/orders/cart/items/${itemId}`)
        .set('Cookie', custCookies)
        .send({ quantity: 2 })
        .expect(200);
      expect(res.body.cart.items[0].quantity).toBe(2);
    });

    it('PATCH cart/items/:id tidak ada -> 404', () => {
      return request(server())
        .patch('/api/orders/cart/items/00000000-0000-0000-0000-000000000000')
        .set('Cookie', custCookies)
        .send({ quantity: 1 })
        .expect(404);
    });
  });

  describe('Checkout', () => {
    it('checkout keranjang kosong -> 409', async () => {
      // Kosongkan cart dulu
      const cart = await request(server())
        .get('/api/orders/cart')
        .set('Cookie', custCookies)
        .expect(200);
      for (const item of cart.body.cart.items) {
        await request(server())
          .delete(`/api/orders/cart/items/${item.id}`)
          .set('Cookie', custCookies)
          .expect(200);
      }
      return request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({
          fulfillmentMethod: 'delivery',
          paymentMethod: 'online',
          addressId,
        })
        .expect(409);
    });

    it('checkout delivery tanpa addressId -> 400', async () => {
      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      return request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({ fulfillmentMethod: 'delivery', paymentMethod: 'online' })
        .expect(400);
    });

    it('checkout delivery dgn addressId internal -> 201, hitung benar, cart kosong', async () => {
      const res = await request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({
          fulfillmentMethod: 'delivery',
          paymentMethod: 'online',
          addressId,
          notes: 'test',
        })
        .expect(201);
      expect(res.body.order).toMatchObject({
        status: 'created',
        paymentType: 'prepaid',
        fulfillmentMethod: 'delivery',
        shippingMethod: 'internal',
        subtotal: 40000,
        discount: 0,
        deliveryFee: 12000,
        total: 52000,
      });
      expect(res.body.order.orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);

      const cart = await request(server())
        .get('/api/orders/cart')
        .set('Cookie', custCookies)
        .expect(200);
      expect(cart.body.cart.items).toHaveLength(0);
    });

    it('checkout pickup -> deliveryFee 0, shippingMethod null', async () => {
      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      const res = await request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({ fulfillmentMethod: 'pickup', paymentMethod: 'online' })
        .expect(201);
      expect(res.body.order).toMatchObject({
        fulfillmentMethod: 'pickup',
        shippingMethod: null,
        deliveryFee: 0,
      });
    });

    it('checkout out-of-zone -> shippingMethod external, fee fallback', async () => {
      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      const res = await request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({
          fulfillmentMethod: 'delivery',
          paymentMethod: 'online',
          addressId: oozAddressId,
        })
        .expect(201);
      expect(res.body.order).toMatchObject({
        shippingMethod: 'external',
        deliveryFee: 30000,
      });
    });

    it('checkout cod di luar zona internal -> 400', async () => {
      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      return request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({
          fulfillmentMethod: 'delivery',
          paymentMethod: 'cod',
          addressId: oozAddressId,
        })
        .expect(400);
    });

    it('checkout cod dalam zona internal -> 201, status langsung processing', async () => {
      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      const res = await request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({
          fulfillmentMethod: 'delivery',
          paymentMethod: 'cod',
          addressId,
        })
        .expect(201);
      expect(res.body.order.status).toBe('processing');
    });

    it('checkout dgn promo invalid -> 422', async () => {
      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      return request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({
          fulfillmentMethod: 'pickup',
          paymentMethod: 'online',
          promoCode: `TIDAKADA-${runId}`,
        })
        .expect(422);
    });

    it('checkout dgn promo valid -> discount diterapkan', async () => {
      // Bersihkan sisa item dari test sebelumnya (checkout gagal 422 tidak mengosongkan cart).
      const cartBefore = await request(server())
        .get('/api/orders/cart')
        .set('Cookie', custCookies)
        .expect(200);
      for (const item of cartBefore.body.cart.items) {
        await request(server())
          .delete(`/api/orders/cart/items/${item.id}`)
          .set('Cookie', custCookies)
          .expect(200);
      }

      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      const res = await request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({
          fulfillmentMethod: 'pickup',
          paymentMethod: 'online',
          promoCode,
        })
        .expect(201);
      expect(res.body.order.subtotal).toBe(40000);
      expect(res.body.order.discount).toBe(5000);
      expect(res.body.order.total).toBe(40000 - 5000);
    });
  });

  describe('Listing & status', () => {
    let orderId: string;

    beforeAll(async () => {
      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      const res = await request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({ fulfillmentMethod: 'pickup', paymentMethod: 'online' })
        .expect(201);
      orderId = res.body.order.id;
    });

    it('GET /orders -> memuat order sendiri', async () => {
      const res = await request(server())
        .get('/api/orders')
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body.data.some((o: { id: string }) => o.id === orderId)).toBe(
        true,
      );
    });

    it('GET /orders/:id -> 200 pemilik, 403 bukan pemilik via role lain tidak diuji (skip)', async () => {
      const res = await request(server())
        .get(`/api/orders/${orderId}`)
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body.order.id).toBe(orderId);
    });

    it('retail tidak bisa akses GET /orders/admin -> 403', () => {
      return request(server())
        .get('/api/orders/admin')
        .set('Cookie', custCookies)
        .expect(403);
    });

    it('staff GET /orders/admin -> 200', async () => {
      const res = await request(server())
        .get('/api/orders/admin')
        .set('Cookie', staffCookies)
        .expect(200);
      expect(res.body.data.some((o: { id: string }) => o.id === orderId)).toBe(
        true,
      );
    });

    it('staff GET /orders/admin?status=a,b -> 200 (banyak status dipisah koma, dipakai dashboard CMS)', async () => {
      const single = await request(server())
        .get('/api/orders/admin')
        .set('Cookie', staffCookies)
        .expect(200);
      const current = single.body.data.find(
        (o: { id: string }) => o.id === orderId,
      ).status;
      const res = await request(server())
        .get(`/api/orders/admin?status=${current},cancelled`)
        .set('Cookie', staffCookies)
        .expect(200);
      expect(res.body.data.some((o: { id: string }) => o.id === orderId)).toBe(
        true,
      );
    });

    it('staff GET /orders/admin?status=ngaco -> 400 (bukan 500 mentah)', () => {
      return request(server())
        .get('/api/orders/admin?status=ngaco')
        .set('Cookie', staffCookies)
        .expect(400);
    });

    it('PATCH status transisi tidak valid -> 409', () => {
      return request(server())
        .patch(`/api/orders/${orderId}/status`)
        .set('Cookie', staffCookies)
        .send({ status: 'delivered' })
        .expect(409);
    });

    it('PATCH status created -> processing -> ready_for_pickup (pickupCode terisi) -> delivered', async () => {
      await request(server())
        .patch(`/api/orders/${orderId}/status`)
        .set('Cookie', staffCookies)
        .send({ status: 'processing' })
        .expect(200);
      const res = await request(server())
        .patch(`/api/orders/${orderId}/status`)
        .set('Cookie', staffCookies)
        .send({ status: 'ready_for_pickup' })
        .expect(200);
      expect(res.body.order.pickupCode).toMatch(/^[A-Z0-9]{6}$/);

      const finalRes = await request(server())
        .patch(`/api/orders/${orderId}/status`)
        .set('Cookie', staffCookies)
        .send({ status: 'delivered' })
        .expect(200);
      expect(finalRes.body.order.status).toBe('delivered');
    });

    it('retail tidak bisa ubah status -> 403', () => {
      return request(server())
        .patch(`/api/orders/${orderId}/status`)
        .set('Cookie', custCookies)
        .send({ status: 'cancelled' })
        .expect(403);
    });
  });

  describe('Cancel — release stok', () => {
    it('cancel order created -> 200, reserved stok berkurang', async () => {
      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 2 })
        .expect(201);
      const checkoutRes = await request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({ fulfillmentMethod: 'pickup', paymentMethod: 'online' })
        .expect(201);
      const cancelOrderId = checkoutRes.body.order.id;

      const res = await request(server())
        .patch(`/api/orders/${cancelOrderId}/status`)
        .set('Cookie', staffCookies)
        .send({ status: 'cancelled', note: 'batal' })
        .expect(200);
      expect(res.body.order.status).toBe('cancelled');

      const avail = await request(server())
        .get('/api/inventory/availability')
        .query({ variantId })
        .expect(200);
      expect(avail.body.available).toBe(true);
    });
  });
});
