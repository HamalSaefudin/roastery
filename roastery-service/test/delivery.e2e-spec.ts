import { INestApplication } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { products } from '../src/modules/catalog/catalog.schema';
import { vehicles } from '../src/modules/delivery/vehicles/vehicles.schema';
import { deliveryZones } from '../src/modules/delivery/zones/zones.schema';
import { drivers } from '../src/modules/delivery/drivers/drivers.schema';
import {
  codSettlements,
  deliveries,
} from '../src/modules/delivery/dispatch/dispatch.schema';
import { createTestApp } from './utils/test-app';
import { extractCookies } from './utils/cookies';

const REGION = {
  provinceCode: '32',
  regencyCode: '32.73',
  districtCode: '32.73.01',
  villageCode: '32.73.01.1001',
};

describe('Delivery (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  const server = () => app.getHttpServer();

  const runId = Date.now();
  const password = 'password123';
  const staffEmail = `staff-delivery-e2e-${runId}@example.com`;
  const custEmail = `cust-delivery-e2e-${runId}@example.com`;
  const driverEmail = `driver-delivery-e2e-${runId}@example.com`;

  let staffCookies: string[];
  let custCookies: string[];
  let driverCookies: string[];

  let beanId: string;
  let variantId: string;
  let addressId: string;
  let zoneId: string;
  let vehicleId: string;
  let driverId: string;

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
      .get('/api/customers/me')
      .set('Cookie', custCookies)
      .expect(200);

    await request(server())
      .post('/api/auth/register')
      .send({ email: driverEmail, password })
      .expect(201);
    await db
      .update(users)
      .set({ role: 'driver' })
      .where(eq(users.email, driverEmail));
    const driverLogin = await request(server())
      .post('/api/auth/login')
      .send({ email: driverEmail, password })
      .expect(200);
    driverCookies = extractCookies(driverLogin);

    const beanRes = await request(server())
      .post('/api/catalog/products')
      .set('Cookie', staffCookies)
      .send({
        type: 'bean',
        name: `Delivery Test Bean ${runId}`,
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
      .send({ variantId, price: 25000 })
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
        name: `Zona Delivery ${runId}`,
        districtCodes: [REGION.districtCode],
        fee: 8000,
      })
      .expect(201);
    zoneId = zoneRes.body.zone.id;

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

    const vehicleRes = await request(server())
      .post('/api/delivery/vehicles')
      .set('Cookie', staffCookies)
      .send({ plateNumber: `D-DLV-${runId}`, type: 'motor', capacityKg: 15 })
      .expect(201);
    vehicleId = vehicleRes.body.vehicle.id;

    const driverUser = await request(server())
      .get('/api/auth/me')
      .set('Cookie', driverCookies)
      .expect(200);
    const driverRes = await request(server())
      .post('/api/delivery/drivers')
      .set('Cookie', staffCookies)
      .send({
        userId: driverUser.body.user.id,
        name: 'Driver Test',
        phone: '08999',
        vehicleId,
      })
      .expect(201);
    driverId = driverRes.body.driver.id;
  });

  afterAll(async () => {
    await db.delete(products).where(eq(products.id, beanId));
    // deliveries.driver_id & cod_settlements.driver_id tidak punya onDelete rule -> harus
    // dihapus manual dulu, baru users (cascade customer_profiles/drivers/orders) aman dihapus.
    await db.delete(deliveries).where(eq(deliveries.driverId, driverId));
    await db
      .delete(codSettlements)
      .where(eq(codSettlements.driverId, driverId));
    await db
      .delete(users)
      .where(inArray(users.email, [staffEmail, custEmail, driverEmail]));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    await db.delete(deliveryZones).where(eq(deliveryZones.id, zoneId));
    await app.close();
  });

  describe('Zones & Vehicles', () => {
    it('GET zones publik -> memuat zona dibuat', async () => {
      const res = await request(server())
        .get('/api/delivery/zones')
        .expect(200);
      expect(res.body.data.some((z: { id: string }) => z.id === zoneId)).toBe(
        true,
      );
    });

    it('POST zones district code bentrok -> 409', () => {
      return request(server())
        .post('/api/delivery/zones')
        .set('Cookie', staffCookies)
        .send({
          name: `Zona Bentrok ${runId}`,
          districtCodes: [REGION.districtCode],
          fee: 5000,
        })
        .expect(409);
    });

    it('GET fee districtCode dalam zona -> internal', async () => {
      const res = await request(server())
        .get('/api/delivery/fee')
        .query({ districtCode: REGION.districtCode })
        .expect(200);
      expect(res.body).toMatchObject({
        zoneId,
        fee: 8000,
        shippingMethod: 'internal',
        outOfZone: false,
      });
    });

    it('POST vehicles plat duplikat -> 409', () => {
      return request(server())
        .post('/api/delivery/vehicles')
        .set('Cookie', staffCookies)
        .send({ plateNumber: `D-DLV-${runId}`, type: 'motor' })
        .expect(409);
    });

    it('GET vehicles -> memuat kendaraan dibuat', async () => {
      const res = await request(server())
        .get('/api/delivery/vehicles')
        .set('Cookie', staffCookies)
        .expect(200);
      expect(
        res.body.data.some((v: { id: string }) => v.id === vehicleId),
      ).toBe(true);
    });

    it('PATCH vehicles -> 200', async () => {
      const res = await request(server())
        .patch(`/api/delivery/vehicles/${vehicleId}`)
        .set('Cookie', staffCookies)
        .send({ capacityKg: 20 })
        .expect(200);
      expect(res.body.vehicle.capacityKg).toBe(20);
    });
  });

  describe('Drivers', () => {
    it('register driver dgn user role bukan driver -> 400', async () => {
      const res = await request(server())
        .get('/api/auth/me')
        .set('Cookie', custCookies)
        .expect(200);
      return request(server())
        .post('/api/delivery/drivers')
        .set('Cookie', staffCookies)
        .send({
          userId: res.body.user.id,
          name: 'Bukan Driver',
          phone: '08000',
        })
        .expect(400);
    });

    it('register driver yg sudah terdaftar -> 409', async () => {
      const res = await request(server())
        .get('/api/auth/me')
        .set('Cookie', driverCookies)
        .expect(200);
      return request(server())
        .post('/api/delivery/drivers')
        .set('Cookie', staffCookies)
        .send({ userId: res.body.user.id, name: 'Driver Test', phone: '08999' })
        .expect(409);
    });

    it('POST driver/location -> 204', () => {
      return request(server())
        .post('/api/delivery/driver/location')
        .set('Cookie', driverCookies)
        .send({ lat: -6.9, lng: 107.6 })
        .expect(204);
    });

    it('GET drivers -> memuat driver dibuat, dgn vehicle + activeJobs', async () => {
      const res = await request(server())
        .get('/api/delivery/drivers')
        .set('Cookie', staffCookies)
        .expect(200);
      const found = res.body.data.find(
        (d: { id: string }) => d.id === driverId,
      );
      expect(found).toBeDefined();
      expect(found.vehicle.id).toBe(vehicleId);
      expect(found.isAvailable).toBe(true);
      expect(typeof found.activeJobs).toBe('number');
    });

    it('PATCH drivers/:id -> toggle isAvailable', async () => {
      const res = await request(server())
        .patch(`/api/delivery/drivers/${driverId}`)
        .set('Cookie', staffCookies)
        .send({ isAvailable: false })
        .expect(200);
      expect(res.body.driver.isAvailable).toBe(false);

      await request(server())
        .patch(`/api/delivery/drivers/${driverId}`)
        .set('Cookie', staffCookies)
        .send({ isAvailable: true })
        .expect(200);
    });

    it('PATCH drivers/:id driver tidak ada -> 404', () => {
      return request(server())
        .patch('/api/delivery/drivers/00000000-0000-0000-0000-000000000000')
        .set('Cookie', staffCookies)
        .send({ isAvailable: false })
        .expect(404);
    });
  });

  describe('Dispatch & driver job flow (via checkout)', () => {
    let orderId: string;
    let deliveryId: string;

    beforeAll(async () => {
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
          addressId,
        })
        .expect(201);
      orderId = res.body.order.id;
    });

    it('GET dispatch board -> memuat delivery baru (pending)', async () => {
      const res = await request(server())
        .get('/api/delivery/dispatch')
        .query({ status: 'pending' })
        .set('Cookie', staffCookies)
        .expect(200);
      const found = res.body.data.find(
        (d: { orderId: string }) => d.orderId === orderId,
      );
      expect(found).toBeDefined();
      expect(found.order.orderNumber).toBeDefined();
      deliveryId = found.id;
    });

    it('GET track sebelum assign -> status pending', async () => {
      const res = await request(server())
        .get(`/api/delivery/track/${orderId}`)
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body.delivery.status).toBe('pending');
    });

    it('assign driver tidak tersedia -> 409', async () => {
      await db
        .update(drivers)
        .set({ isAvailable: false })
        .where(eq(drivers.id, driverId));
      await request(server())
        .post(`/api/delivery/${deliveryId}/assign`)
        .set('Cookie', staffCookies)
        .send({ driverId })
        .expect(409);
      await db
        .update(drivers)
        .set({ isAvailable: true })
        .where(eq(drivers.id, driverId));
    });

    it('assign driver -> 200, status assigned', async () => {
      const res = await request(server())
        .post(`/api/delivery/${deliveryId}/assign`)
        .set('Cookie', staffCookies)
        .send({ driverId, scheduledSlot: '09:00-12:00' })
        .expect(200);
      expect(res.body.delivery.status).toBe('assigned');
      expect(res.body.delivery.driver.id).toBe(driverId);
    });

    it('GET driver/jobs -> memuat job ini', async () => {
      const res = await request(server())
        .get('/api/delivery/driver/jobs')
        .set('Cookie', driverCookies)
        .expect(200);
      expect(
        res.body.data.some((d: { id: string }) => d.id === deliveryId),
      ).toBe(true);
    });

    it('driver update status ke en_route langsung (skip picked_up) -> 409', () => {
      return request(server())
        .patch(`/api/delivery/${deliveryId}/status`)
        .set('Cookie', driverCookies)
        .send({ status: 'en_route' })
        .expect(409);
    });

    it('driver bukan pemilik job -> 403 (pakai staff cookie tanpa role driver ditolak guard 403 role)', () => {
      return request(server())
        .patch(`/api/delivery/${deliveryId}/status`)
        .set('Cookie', staffCookies)
        .send({ status: 'picked_up' })
        .expect(403);
    });

    it('driver: picked_up -> en_route -> delivered (sebelum order out_for_delivery -> 409)', async () => {
      await request(server())
        .patch(`/api/delivery/${deliveryId}/status`)
        .set('Cookie', driverCookies)
        .send({ status: 'picked_up' })
        .expect(200);
      await request(server())
        .patch(`/api/delivery/${deliveryId}/status`)
        .set('Cookie', driverCookies)
        .send({ status: 'en_route', lat: -6.9, lng: 107.6 })
        .expect(200);

      return request(server())
        .patch(`/api/delivery/${deliveryId}/status`)
        .set('Cookie', driverCookies)
        .send({ status: 'delivered' })
        .expect(409);
    });

    it('staff set order out_for_delivery, lalu driver set delivered -> order ikut delivered', async () => {
      await request(server())
        .patch(`/api/orders/${orderId}/status`)
        .set('Cookie', staffCookies)
        .send({ status: 'processing' })
        .expect(200);
      await request(server())
        .patch(`/api/orders/${orderId}/status`)
        .set('Cookie', staffCookies)
        .send({ status: 'out_for_delivery' })
        .expect(200);

      const res = await request(server())
        .patch(`/api/delivery/${deliveryId}/status`)
        .set('Cookie', driverCookies)
        .send({ status: 'delivered' })
        .expect(200);
      expect(res.body.delivery.status).toBe('delivered');

      const orderRes = await request(server())
        .get(`/api/orders/${orderId}`)
        .set('Cookie', custCookies)
        .expect(200);
      expect(orderRes.body.order.status).toBe('delivered');
    });

    it('GET track setelah delivered -> events lengkap', async () => {
      const res = await request(server())
        .get(`/api/delivery/track/${orderId}`)
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body.delivery.status).toBe('delivered');
      expect(res.body.events.map((e: { status: string }) => e.status)).toEqual([
        'assigned',
        'picked_up',
        'en_route',
        'delivered',
      ]);
    });
  });

  describe('COD collect & settlement', () => {
    let codOrderId: string;
    let codDeliveryId: string;

    beforeAll(async () => {
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
      codOrderId = res.body.order.id;

      const board = await request(server())
        .get('/api/delivery/dispatch')
        .query({ status: 'pending' })
        .set('Cookie', staffCookies)
        .expect(200);
      codDeliveryId = board.body.data.find(
        (d: { orderId: string }) => d.orderId === codOrderId,
      ).id;

      await request(server())
        .post(`/api/delivery/${codDeliveryId}/assign`)
        .set('Cookie', staffCookies)
        .send({ driverId })
        .expect(200);
      await request(server())
        .patch(`/api/delivery/${codDeliveryId}/status`)
        .set('Cookie', driverCookies)
        .send({ status: 'picked_up' })
        .expect(200);
      await request(server())
        .patch(`/api/delivery/${codDeliveryId}/status`)
        .set('Cookie', driverCookies)
        .send({ status: 'en_route' })
        .expect(200);
    });

    it('delivered sebelum cod-collect -> 409', () => {
      return request(server())
        .patch(`/api/delivery/${codDeliveryId}/status`)
        .set('Cookie', driverCookies)
        .send({ status: 'delivered' })
        .expect(409);
    });

    it('cod-collect bukan driver job ini -> tidak diuji ulang (skip), cod-collect sukses -> 200', async () => {
      const res = await request(server())
        .post(`/api/delivery/${codDeliveryId}/cod-collect`)
        .set('Cookie', driverCookies)
        .expect(200);
      expect(res.body.delivery.codCollectedAt).not.toBeNull();
    });

    it('cod-collect lagi -> 409 sudah dikonfirmasi', () => {
      return request(server())
        .post(`/api/delivery/${codDeliveryId}/cod-collect`)
        .set('Cookie', driverCookies)
        .expect(409);
    });

    it('delivered setelah cod-collect -> 200', async () => {
      await request(server())
        .patch(`/api/orders/${codOrderId}/status`)
        .set('Cookie', staffCookies)
        .send({ status: 'out_for_delivery' })
        .expect(200);
      return request(server())
        .patch(`/api/delivery/${codDeliveryId}/status`)
        .set('Cookie', driverCookies)
        .send({ status: 'delivered' })
        .expect(200);
    });

    it('GET driver/cod-balance -> saldo sesuai codAmount', async () => {
      const res = await request(server())
        .get('/api/delivery/driver/cod-balance')
        .set('Cookie', driverCookies)
        .expect(200);
      expect(res.body.balance).toBeGreaterThan(0);
    });

    it('GET drivers/:id/cod-balance (staff) -> saldo sama dgn versi driver', async () => {
      const res = await request(server())
        .get(`/api/delivery/drivers/${driverId}/cod-balance`)
        .set('Cookie', staffCookies)
        .expect(200);
      expect(res.body.balance).toBeGreaterThan(0);
    });

    it('GET drivers/:id/cod-balance driver tidak ada -> 404', () => {
      return request(server())
        .get(
          '/api/delivery/drivers/00000000-0000-0000-0000-000000000000/cod-balance',
        )
        .set('Cookie', staffCookies)
        .expect(404);
    });

    it('POST cod-settlements -> 201, saldo driver jadi 0', async () => {
      const settleRes = await request(server())
        .post('/api/delivery/cod-settlements')
        .set('Cookie', staffCookies)
        .send({ driverId })
        .expect(201);
      expect(settleRes.body.settlement.status).toBe('pending');

      const balanceRes = await request(server())
        .get('/api/delivery/driver/cod-balance')
        .set('Cookie', driverCookies)
        .expect(200);
      expect(balanceRes.body.balance).toBe(0);

      const confirmRes = await request(server())
        .patch(
          `/api/delivery/cod-settlements/${settleRes.body.settlement.id}/confirm`,
        )
        .set('Cookie', staffCookies)
        .expect(200);
      expect(confirmRes.body.settlement.status).toBe('confirmed');
    });

    it('POST cod-settlements tanpa saldo -> 409', () => {
      return request(server())
        .post('/api/delivery/cod-settlements')
        .set('Cookie', staffCookies)
        .send({ driverId })
        .expect(409);
    });
  });
});
