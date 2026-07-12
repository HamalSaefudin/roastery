import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { products } from '../src/modules/catalog/catalog.schema';
import { brands } from '../src/modules/catalog/brands/brands.schema';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { createTestApp } from './utils/test-app';
import { extractCookies } from './utils/cookies';

describe('Inventory (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let inventoryService: InventoryService;
  const server = () => app.getHttpServer();

  const runId = Date.now();
  const password = 'password123';
  const staffEmail = `staff-inventory-e2e-${runId}@example.com`;
  const custEmail = `cust-inventory-e2e-${runId}@example.com`;

  let staffCookies: string[];
  let custCookies: string[];

  let brandId: string;
  let beanId: string;
  let variantId: string;
  let machineId: string;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<DrizzleDB>(DRIZZLE);
    inventoryService = app.get<InventoryService>(InventoryService);

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

    const brandRes = await request(server())
      .post('/api/catalog/brands')
      .set('Cookie', staffCookies)
      .send({ name: `Inventory Test Brand ${runId}` })
      .expect(201);
    brandId = brandRes.body.brand.id;

    const beanRes = await request(server())
      .post('/api/catalog/products')
      .set('Cookie', staffCookies)
      .send({
        type: 'bean',
        name: `Inventory Test Bean ${runId}`,
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

    const machineRes = await request(server())
      .post('/api/catalog/products')
      .set('Cookie', staffCookies)
      .send({
        type: 'machine',
        name: `Inventory Test Machine ${runId}`,
        brandId,
        detail: { warrantyMonths: 12 },
      })
      .expect(201);
    machineId = machineRes.body.product.id;
  });

  afterAll(async () => {
    await db
      .delete(products)
      .where(inArray(products.id, [beanId, machineId].filter(Boolean)));
    if (brandId) await db.delete(brands).where(eq(brands.id, brandId));
    await db.delete(users).where(inArray(users.email, [staffEmail, custEmail]));
    await app.close();
  });

  describe('Stok biji', () => {
    it('PATCH tanpa login -> 401', () => {
      return request(server())
        .patch(`/api/inventory/bean-stock/${variantId}`)
        .send({ quantity: 40, reason: 'purchase' })
        .expect(401);
    });

    it('PATCH sebagai retail -> 403', () => {
      return request(server())
        .patch(`/api/inventory/bean-stock/${variantId}`)
        .set('Cookie', custCookies)
        .send({ quantity: 40, reason: 'purchase' })
        .expect(403);
    });

    it('PATCH variant tidak ada -> 404', () => {
      return request(server())
        .patch('/api/inventory/bean-stock/00000000-0000-0000-0000-000000000000')
        .set('Cookie', staffCookies)
        .send({ quantity: 40, reason: 'purchase' })
        .expect(404);
    });

    it('PATCH set quantity 40 -> 200, movement tercatat', async () => {
      const res = await request(server())
        .patch(`/api/inventory/bean-stock/${variantId}`)
        .set('Cookie', staffCookies)
        .send({ quantity: 40, lowStockThreshold: 5, reason: 'purchase' })
        .expect(200);
      expect(res.body.stock).toMatchObject({
        variantId,
        quantity: 40,
        reserved: 0,
        available: 40,
        lowStockThreshold: 5,
      });
    });

    it('GET overview -> memuat stok bean', async () => {
      const res = await request(server())
        .get('/api/inventory/overview')
        .set('Cookie', staffCookies)
        .expect(200);
      expect(
        res.body.beans.some(
          (b: { variantId: string }) => b.variantId === variantId,
        ),
      ).toBe(true);
    });

    it('GET low-stock -> kosong (40 > threshold 5)', async () => {
      const res = await request(server())
        .get('/api/inventory/low-stock')
        .set('Cookie', staffCookies)
        .expect(200);
      expect(
        res.body.data.some(
          (b: { variantId: string }) => b.variantId === variantId,
        ),
      ).toBe(false);
    });

    it('GET availability publik -> available true quantity 40', async () => {
      const res = await request(server())
        .get('/api/inventory/availability')
        .query({ variantId })
        .expect(200);
      expect(res.body).toEqual({ available: true, quantity: 40 });
    });

    it('PATCH set quantity 3 (di bawah threshold) -> low-stock memuatnya', async () => {
      await request(server())
        .patch(`/api/inventory/bean-stock/${variantId}`)
        .set('Cookie', staffCookies)
        .send({ quantity: 3, reason: 'adjustment' })
        .expect(200);

      const res = await request(server())
        .get('/api/inventory/low-stock')
        .set('Cookie', staffCookies)
        .expect(200);
      expect(
        res.body.data.some(
          (b: { variantId: string }) => b.variantId === variantId,
        ),
      ).toBe(true);
    });

    it('GET availability tanpa variantId/productId -> 400', () => {
      return request(server()).get('/api/inventory/availability').expect(400);
    });
  });

  describe('Unit equipment', () => {
    let unitId: string;

    it('POST equipment-units -> 201', async () => {
      const res = await request(server())
        .post('/api/inventory/equipment-units')
        .set('Cookie', staffCookies)
        .send({ productId: machineId, serialNumber: `SN-INV-${runId}` })
        .expect(201);
      unitId = res.body.unit.id;
      expect(res.body.unit.status).toBe('in_stock');
    });

    it('POST serial duplikat -> 409', () => {
      return request(server())
        .post('/api/inventory/equipment-units')
        .set('Cookie', staffCookies)
        .send({ productId: machineId, serialNumber: `SN-INV-${runId}` })
        .expect(409);
    });

    it('POST productId produk bean (bukan mesin/grinder) -> 404', () => {
      return request(server())
        .post('/api/inventory/equipment-units')
        .set('Cookie', staffCookies)
        .send({ productId: beanId, serialNumber: `SN-INV-INVALID-${runId}` })
        .expect(404);
    });

    it('GET equipment-units filter productId -> memuat unit', async () => {
      const res = await request(server())
        .get('/api/inventory/equipment-units')
        .query({ productId: machineId })
        .set('Cookie', staffCookies)
        .expect(200);
      expect(res.body.data.some((u: { id: string }) => u.id === unitId)).toBe(
        true,
      );
    });

    it('GET availability?productId= -> quantity 1 (in_stock)', async () => {
      const res = await request(server())
        .get('/api/inventory/availability')
        .query({ productId: machineId })
        .expect(200);
      expect(res.body).toEqual({ available: true, quantity: 1 });
    });

    it('PATCH status defective -> 200', async () => {
      const res = await request(server())
        .patch(`/api/inventory/equipment-units/${unitId}`)
        .set('Cookie', staffCookies)
        .send({ status: 'defective' })
        .expect(200);
      expect(res.body.unit.status).toBe('defective');
    });

    it('GET availability?productId= setelah defective -> quantity 0', async () => {
      const res = await request(server())
        .get('/api/inventory/availability')
        .query({ productId: machineId })
        .expect(200);
      expect(res.body).toEqual({ available: false, quantity: 0 });
    });

    it('PATCH unit tidak ada -> 404', () => {
      return request(server())
        .patch(
          '/api/inventory/equipment-units/00000000-0000-0000-0000-000000000000',
        )
        .set('Cookie', staffCookies)
        .send({ status: 'defective' })
        .expect(404);
    });
  });

  describe('Reserve/release/commit — dipakai modul Orders lewat DI', () => {
    beforeAll(async () => {
      await request(server())
        .patch(`/api/inventory/bean-stock/${variantId}`)
        .set('Cookie', staffCookies)
        .send({ quantity: 10, reason: 'adjustment' })
        .expect(200);
    });

    it('reserveBeanStock mengurangi available, menyisakan quantity utuh', async () => {
      const orderId = randomUUID();
      await inventoryService.reserveBeanStock(variantId, 4, orderId);
      const avail = await inventoryService.availability(variantId);
      expect(avail).toEqual({ available: true, quantity: 6 });
      await inventoryService.releaseBeanStock(variantId, 4, orderId);
    });

    it('reserveBeanStock melebihi stok tersedia -> ConflictException', async () => {
      await expect(
        inventoryService.reserveBeanStock(variantId, 100, randomUUID()),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('releaseBeanStock mengembalikan available', async () => {
      const orderId = randomUUID();
      await inventoryService.reserveBeanStock(variantId, 4, orderId);
      await inventoryService.releaseBeanStock(variantId, 4, orderId);
      const avail = await inventoryService.availability(variantId);
      expect(avail).toEqual({ available: true, quantity: 10 });
    });

    it('commitBeanStock mengurangi quantity permanen', async () => {
      const orderId = randomUUID();
      await inventoryService.reserveBeanStock(variantId, 3, orderId);
      await inventoryService.commitBeanStock(variantId, 3, orderId);
      const avail = await inventoryService.availability(variantId);
      expect(avail).toEqual({ available: true, quantity: 7 });
    });

    it('reserveEquipmentUnits memilih unit in_stock lalu commit -> sold', async () => {
      const orderId = randomUUID();
      const freshUnit = await inventoryService.createEquipmentUnit({
        productId: machineId,
        serialNumber: `SN-INV-RESERVE-${runId}`,
      });
      const ids = await inventoryService.reserveEquipmentUnits(
        machineId,
        1,
        orderId,
      );
      expect(ids).toEqual([freshUnit.id]);

      const avail = await inventoryService.availability(undefined, machineId);
      expect(avail).toEqual({ available: false, quantity: 0 });

      await inventoryService.commitEquipmentUnits(ids, orderId);
      const res = await request(server())
        .get('/api/inventory/equipment-units')
        .query({ productId: machineId, status: 'sold' })
        .set('Cookie', staffCookies)
        .expect(200);
      expect(
        res.body.data.some((u: { id: string }) => u.id === freshUnit.id),
      ).toBe(true);
    });

    it('reserveEquipmentUnits melebihi stok -> ConflictException', async () => {
      await expect(
        inventoryService.reserveEquipmentUnits(machineId, 5, randomUUID()),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('reserveEquipmentUnits lalu releaseEquipmentUnits -> kembali in_stock', async () => {
      const orderId = randomUUID();
      const freshUnit = await inventoryService.createEquipmentUnit({
        productId: machineId,
        serialNumber: `SN-INV-RELEASE-${runId}`,
      });
      const ids = await inventoryService.reserveEquipmentUnits(
        machineId,
        1,
        orderId,
      );
      expect(ids).toEqual([freshUnit.id]);
      let avail = await inventoryService.availability(undefined, machineId);
      expect(avail.quantity).toBe(0);

      await inventoryService.releaseEquipmentUnits(ids, orderId);
      avail = await inventoryService.availability(undefined, machineId);
      expect(avail).toEqual({ available: true, quantity: 1 });
    });
  });
});
