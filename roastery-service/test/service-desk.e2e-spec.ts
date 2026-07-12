import { INestApplication } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { products } from '../src/modules/catalog/catalog.schema';
import { brands } from '../src/modules/catalog/brands/brands.schema';
import { equipmentUnits } from '../src/modules/inventory/inventory.schema';
import { warranties } from '../src/modules/service-desk/warranty/warranty.schema';
import { createTestApp } from './utils/test-app';
import { extractCookies } from './utils/cookies';

describe('Service Desk (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  const server = () => app.getHttpServer();

  const runId = Date.now();
  const password = 'password123';
  const staffEmail = `staff-sd-e2e-${runId}@example.com`;
  const custEmail = `cust-sd-e2e-${runId}@example.com`;

  let staffCookies: string[];
  let custCookies: string[];

  let brandId: string;
  let machineId: string;
  let unitId: string;
  let warrantyIdShared: string;
  let warrantyTicketId: string;
  let nonWarrantyTicketId: string;
  const serialNumber = `SN-SD-E2E-${runId}`;

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

    const brandRes = await request(server())
      .post('/api/catalog/brands')
      .set('Cookie', staffCookies)
      .send({ name: `SD Test Brand ${runId}` })
      .expect(201);
    brandId = brandRes.body.brand.id;

    const machineRes = await request(server())
      .post('/api/catalog/products')
      .set('Cookie', staffCookies)
      .send({
        type: 'machine',
        name: `SD Test Machine ${runId}`,
        brandId,
        detail: { warrantyMonths: 12 },
      })
      .expect(201);
    machineId = machineRes.body.product.id;

    const unitRes = await request(server())
      .post('/api/inventory/equipment-units')
      .set('Cookie', staffCookies)
      .send({ productId: machineId, serialNumber })
      .expect(201);
    unitId = unitRes.body.unit.id;
  });

  afterAll(async () => {
    // warranties.equipment_unit_id tidak punya onDelete rule (master-data reference, konvensi §5) ->
    // harus dihapus dulu, baru products (cascade ke equipment_units) aman dihapus.
    await db.delete(warranties).where(eq(warranties.equipmentUnitId, unitId));
    await db.delete(products).where(eq(products.id, machineId));
    await db.delete(brands).where(eq(brands.id, brandId));
    await db.delete(users).where(inArray(users.email, [staffEmail, custEmail]));
    await app.close();
  });

  describe('Warranty', () => {
    it('registrasi sebelum unit terjual -> 400', () => {
      return request(server())
        .post('/api/service-desk/warranties')
        .set('Cookie', custCookies)
        .send({ serialNumber })
        .expect(400);
    });

    it('registrasi serial tidak ada -> 404', () => {
      return request(server())
        .post('/api/service-desk/warranties')
        .set('Cookie', custCookies)
        .send({ serialNumber: `TIDAK-ADA-${runId}` })
        .expect(404);
    });

    it('registrasi setelah unit sold -> 201, ends_at = starts_at + warrantyMonths', async () => {
      await db
        .update(equipmentUnits)
        .set({ status: 'sold' })
        .where(eq(equipmentUnits.id, unitId));

      const res = await request(server())
        .post('/api/service-desk/warranties')
        .set('Cookie', custCookies)
        .send({ serialNumber })
        .expect(201);
      expect(res.body.warranty.warrantyNumber).toMatch(/^WRT-\d{6}$/);
      expect(res.body.warranty.isActive).toBe(true);

      const starts = new Date(res.body.warranty.startsAt);
      const ends = new Date(res.body.warranty.endsAt);
      const monthsDiff =
        (ends.getFullYear() - starts.getFullYear()) * 12 +
        (ends.getMonth() - starts.getMonth());
      expect(monthsDiff).toBe(12);
      warrantyIdShared = res.body.warranty.id;
    });

    it('registrasi lagi unit yang sama -> 409', () => {
      return request(server())
        .post('/api/service-desk/warranties')
        .set('Cookie', custCookies)
        .send({ serialNumber })
        .expect(409);
    });

    it('GET warranties milik sendiri -> memuat registrasi', async () => {
      const res = await request(server())
        .get('/api/service-desk/warranties')
        .set('Cookie', custCookies)
        .expect(200);
      expect(
        res.body.data.some((w: { id: string }) => w.id === warrantyIdShared),
      ).toBe(true);
    });
  });

  describe('Repairs — customer', () => {
    it('POST repair dgn klaim garansi valid -> isWarranty true', async () => {
      const res = await request(server())
        .post('/api/service-desk/repairs')
        .set('Cookie', custCookies)
        .send({
          issue: 'Mesin tidak panas',
          serialNumber,
          warrantyId: warrantyIdShared,
        })
        .expect(201);
      expect(res.body.ticket.isWarranty).toBe(true);
      expect(res.body.ticket.ticketNumber).toMatch(/^RPR-\d{8}-\d{3}$/);
      warrantyTicketId = res.body.ticket.id;
    });

    it('POST repair dgn warrantyId asing/invalid -> tetap 201, isWarranty false', async () => {
      const res = await request(server())
        .post('/api/service-desk/repairs')
        .set('Cookie', custCookies)
        .send({
          issue: 'Bunyi aneh',
          warrantyId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(201);
      expect(res.body.ticket.isWarranty).toBe(false);
      nonWarrantyTicketId = res.body.ticket.id;
    });

    it('POST repair tanpa serial/warranty -> 201', () => {
      return request(server())
        .post('/api/service-desk/repairs')
        .set('Cookie', custCookies)
        .send({ issue: 'Konsultasi umum' })
        .expect(201);
    });

    it('GET repairs milik sendiri -> memuat tiket dibuat', async () => {
      const res = await request(server())
        .get('/api/service-desk/repairs')
        .set('Cookie', custCookies)
        .expect(200);
      expect(
        res.body.data.some((t: { id: string }) => t.id === warrantyTicketId),
      ).toBe(true);
    });
  });

  describe('Repairs — staff', () => {
    it('retail tidak bisa akses admin -> 403', () => {
      return request(server())
        .get('/api/service-desk/repairs/admin')
        .set('Cookie', custCookies)
        .expect(403);
    });

    it('staff GET admin -> 200', async () => {
      const res = await request(server())
        .get('/api/service-desk/repairs/admin')
        .query({ status: 'open' })
        .set('Cookie', staffCookies)
        .expect(200);
      expect(
        res.body.data.some((t: { id: string }) => t.id === warrantyTicketId),
      ).toBe(true);
    });

    it('PATCH cost pada tiket garansi -> 400', () => {
      return request(server())
        .patch(`/api/service-desk/repairs/${warrantyTicketId}`)
        .set('Cookie', staffCookies)
        .send({ cost: 50000 })
        .expect(400);
    });

    it('PATCH transisi tidak valid (open -> in_progress langsung) -> 409', () => {
      return request(server())
        .patch(`/api/service-desk/repairs/${warrantyTicketId}`)
        .set('Cookie', staffCookies)
        .send({ status: 'in_progress' })
        .expect(409);
    });

    it('PATCH assignedTo user tidak ada -> 404', () => {
      return request(server())
        .patch(`/api/service-desk/repairs/${warrantyTicketId}`)
        .set('Cookie', staffCookies)
        .send({ assignedTo: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('PATCH status open->diagnosing->in_progress->completed dgn parts', async () => {
      await request(server())
        .patch(`/api/service-desk/repairs/${warrantyTicketId}`)
        .set('Cookie', staffCookies)
        .send({ status: 'diagnosing', note: 'cek dulu' })
        .expect(200);
      await request(server())
        .patch(`/api/service-desk/repairs/${warrantyTicketId}`)
        .set('Cookie', staffCookies)
        .send({ status: 'in_progress' })
        .expect(200);
      const res = await request(server())
        .patch(`/api/service-desk/repairs/${warrantyTicketId}`)
        .set('Cookie', staffCookies)
        .send({
          status: 'completed',
          parts: [{ name: 'heating element', qty: 1 }],
          note: 'selesai',
        })
        .expect(200);
      expect(res.body.ticket.status).toBe('completed');
    });

    it('PATCH setelah completed (final) -> 409', () => {
      return request(server())
        .patch(`/api/service-desk/repairs/${warrantyTicketId}`)
        .set('Cookie', staffCookies)
        .send({ status: 'in_progress' })
        .expect(409);
    });

    it('PATCH cost pada tiket non-garansi -> 200', async () => {
      const res = await request(server())
        .patch(`/api/service-desk/repairs/${nonWarrantyTicketId}`)
        .set('Cookie', staffCookies)
        .send({ cost: 150000, scheduledAt: '2026-07-20T10:00:00Z' })
        .expect(200);
      expect(res.body.ticket.cost).toBe(150000);
    });
  });
});
