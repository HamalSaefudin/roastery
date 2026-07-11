import { INestApplication } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { createTestApp } from './utils/test-app';
import { extractCookies } from './utils/cookies';

// Kode wilayah nyata dari data ter-seed (lihat 00. Regions):
// Jawa Barat (32) -> Kota Bandung (32.73) -> Sukasari (32.73.01) -> Sukarasa/Gegerkalong.
const REGION = {
  provinceCode: '32',
  regencyCode: '32.73',
  districtCode: '32.73.01',
  villageCode: '32.73.01.1001', // Sukarasa, kodepos 40152
  villageCode2: '32.73.01.1002', // Gegerkalong, kodepos 40153
};

describe('Customers (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  const server = () => app.getHttpServer();

  const runId = Date.now();
  const password = 'password123';
  const custEmail = `cust-e2e-${runId}@example.com`;
  const cust2Email = `cust2-e2e-${runId}@example.com`;
  const staffEmail = `staff-e2e-${runId}@example.com`;

  let custCookies: string[];
  let cust2Cookies: string[];
  let staffCookies: string[];
  let addressId: string;
  let address2Id: string;
  let applicationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<DrizzleDB>(DRIZZLE);

    const custRes = await request(server())
      .post('/api/auth/register')
      .send({ email: custEmail, password })
      .expect(201);
    custCookies = extractCookies(custRes);

    const cust2Res = await request(server())
      .post('/api/auth/register')
      .send({ email: cust2Email, password })
      .expect(201);
    cust2Cookies = extractCookies(cust2Res);

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
  });

  afterAll(async () => {
    // addresses/wholesale_applications/customer_profiles ikut kehapus via ON DELETE CASCADE.
    await db
      .delete(users)
      .where(inArray(users.email, [custEmail, cust2Email, staffEmail]));
    await app.close();
  });

  it('GET /api/customers/me auto-create profil dengan kode CUS-xxxxxx', async () => {
    const res = await request(server())
      .get('/api/customers/me')
      .set('Cookie', custCookies)
      .expect(200);
    expect(res.body.profile.code).toMatch(/^CUS-\d{6}$/);
    expect(res.body.profile.fullName).toBe('');
    expect(res.body.profile.customerType).toBe('retail');
  });

  it('PATCH /api/customers/me update fullName & phone', async () => {
    const res = await request(server())
      .patch('/api/customers/me')
      .set('Cookie', custCookies)
      .send({ fullName: 'Budi Santoso', phone: '081234567890' })
      .expect(200);
    expect(res.body.profile).toMatchObject({
      fullName: 'Budi Santoso',
      phone: '081234567890',
    });
  });

  describe('Alamat', () => {
    it('POST alamat pertama otomatis jadi default', async () => {
      const res = await request(server())
        .post('/api/customers/me/addresses')
        .set('Cookie', custCookies)
        .send({
          label: 'Rumah',
          recipientName: 'Budi',
          phone: '081234567890',
          line1: 'Jl. Contoh No. 1',
          provinceCode: REGION.provinceCode,
          regencyCode: REGION.regencyCode,
          districtCode: REGION.districtCode,
          villageCode: REGION.villageCode,
        })
        .expect(201);
      addressId = res.body.address.id;
      expect(res.body.address.isDefault).toBe(true);
      expect(res.body.address.postalCode).toBe('40152');
      expect(res.body.address.province.name).toBe('Jawa Barat');
    });

    it('POST alamat kedua TIDAK default', async () => {
      const res = await request(server())
        .post('/api/customers/me/addresses')
        .set('Cookie', custCookies)
        .send({
          label: 'Kantor',
          recipientName: 'Budi',
          phone: '081234567890',
          line1: 'Jl. Kantor No. 2',
          provinceCode: REGION.provinceCode,
          regencyCode: REGION.regencyCode,
          districtCode: REGION.districtCode,
          villageCode: REGION.villageCode2,
        })
        .expect(201);
      address2Id = res.body.address.id;
      expect(res.body.address.isDefault).toBe(false);
    });

    it('GET list alamat -> 2 alamat, default di posisi pertama', async () => {
      const res = await request(server())
        .get('/api/customers/me/addresses')
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body.addresses).toHaveLength(2);
      expect(res.body.addresses[0].isDefault).toBe(true);
    });

    it('POST alamat dgn kode wilayah tidak berjenjang konsisten -> 400', () => {
      return request(server())
        .post('/api/customers/me/addresses')
        .set('Cookie', custCookies)
        .send({
          label: 'Salah',
          recipientName: 'Budi',
          phone: '08123',
          line1: 'Jl. X',
          provinceCode: '11', // Aceh, tidak match districtCode Bandung
          regencyCode: REGION.regencyCode,
          districtCode: REGION.districtCode,
          villageCode: REGION.villageCode,
        })
        .expect(400);
    });

    it('POST alamat dgn villageCode tidak ada -> 400', () => {
      return request(server())
        .post('/api/customers/me/addresses')
        .set('Cookie', custCookies)
        .send({
          label: 'Salah',
          recipientName: 'Budi',
          phone: '08123',
          line1: 'Jl. Y',
          provinceCode: REGION.provinceCode,
          regencyCode: REGION.regencyCode,
          districtCode: REGION.districtCode,
          villageCode: '99.99.99.9999',
        })
        .expect(400);
    });

    it('PATCH alamat ubah label saja', async () => {
      const res = await request(server())
        .patch(`/api/customers/me/addresses/${address2Id}`)
        .set('Cookie', custCookies)
        .send({ label: 'Kantor Baru' })
        .expect(200);
      expect(res.body.address.label).toBe('Kantor Baru');
    });

    it('cust2 tidak bisa akses/ubah alamat milik cust1 -> 404', () => {
      return request(server())
        .patch(`/api/customers/me/addresses/${address2Id}`)
        .set('Cookie', cust2Cookies)
        .send({ label: 'Coba akses punya orang' })
        .expect(404);
    });

    it('DELETE alamat yang tidak ada -> 404', () => {
      return request(server())
        .delete(
          '/api/customers/me/addresses/00000000-0000-0000-0000-000000000000',
        )
        .set('Cookie', custCookies)
        .expect(404);
    });

    it('DELETE alamat default -> alamat lain otomatis jadi default', async () => {
      await request(server())
        .delete(`/api/customers/me/addresses/${addressId}`)
        .set('Cookie', custCookies)
        .expect(204);

      const res = await request(server())
        .get('/api/customers/me/addresses')
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body.addresses).toHaveLength(1);
      expect(res.body.addresses[0].id).toBe(address2Id);
      expect(res.body.addresses[0].isDefault).toBe(true);
    });
  });

  describe('Wholesale application', () => {
    it('POST wholesale-application -> 201 pending', async () => {
      const res = await request(server())
        .post('/api/customers/me/wholesale-application')
        .set('Cookie', custCookies)
        .send({ businessName: 'Kafe Budi', taxId: '12.345.678.9-012.000' })
        .expect(201);
      applicationId = res.body.application.id;
      expect(res.body.application.status).toBe('pending');
    });

    it('POST wholesale-application lagi (masih pending) -> 409', () => {
      return request(server())
        .post('/api/customers/me/wholesale-application')
        .set('Cookie', custCookies)
        .send({ businessName: 'Kafe Budi 2' })
        .expect(409);
    });

    it('GET my wholesale-application -> pending', async () => {
      const res = await request(server())
        .get('/api/customers/me/wholesale-application')
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body.application.status).toBe('pending');
    });

    it('retail tidak bisa akses GET /customers (staff only) -> 403', () => {
      return request(server())
        .get('/api/customers')
        .set('Cookie', custCookies)
        .expect(403);
    });

    it('staff bisa GET /customers -> 200', () => {
      return request(server())
        .get('/api/customers')
        .set('Cookie', staffCookies)
        .expect(200);
    });

    it('staff GET wholesale-applications?status=pending -> memuat aplikasi kita', async () => {
      const res = await request(server())
        .get('/api/customers/wholesale-applications')
        .query({ status: 'pending' })
        .set('Cookie', staffCookies)
        .expect(200);
      expect(
        res.body.data.some((a: { id: string }) => a.id === applicationId),
      ).toBe(true);
    });

    it('reject tanpa note -> 400', () => {
      return request(server())
        .patch(`/api/customers/wholesale-applications/${applicationId}`)
        .set('Cookie', staffCookies)
        .send({ decision: 'reject' })
        .expect(400);
    });

    it('reject dengan note -> 200, status rejected, customerType TETAP retail', async () => {
      const appRes = await request(server())
        .post('/api/customers/me/wholesale-application')
        .set('Cookie', cust2Cookies)
        .send({ businessName: 'Toko Cust2' })
        .expect(201);

      const res = await request(server())
        .patch(
          `/api/customers/wholesale-applications/${appRes.body.application.id}`,
        )
        .set('Cookie', staffCookies)
        .send({ decision: 'reject', note: 'Dokumen tidak lengkap' })
        .expect(200);
      expect(res.body.application.status).toBe('rejected');
      expect(res.body.application.note).toBe('Dokumen tidak lengkap');

      const profileRes = await request(server())
        .get('/api/customers/me')
        .set('Cookie', cust2Cookies)
        .expect(200);
      expect(profileRes.body.profile.customerType).toBe('retail');
    });

    it('approve -> 200, customerType & role user berubah jadi wholesale', async () => {
      await request(server())
        .patch(`/api/customers/wholesale-applications/${applicationId}`)
        .set('Cookie', staffCookies)
        .send({ decision: 'approve' })
        .expect(200);

      const profileRes = await request(server())
        .get('/api/customers/me')
        .set('Cookie', custCookies)
        .expect(200);
      expect(profileRes.body.profile.customerType).toBe('wholesale');

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, custEmail));
      expect(user.role).toBe('wholesale');
    });

    it('approve/reject aplikasi yang sudah diproses -> 409', () => {
      return request(server())
        .patch(`/api/customers/wholesale-applications/${applicationId}`)
        .set('Cookie', staffCookies)
        .send({ decision: 'approve' })
        .expect(409);
    });

    it('approve aplikasi yang tidak ada -> 404', () => {
      return request(server())
        .patch(
          '/api/customers/wholesale-applications/00000000-0000-0000-0000-000000000000',
        )
        .set('Cookie', staffCookies)
        .send({ decision: 'approve' })
        .expect(404);
    });
  });
});
