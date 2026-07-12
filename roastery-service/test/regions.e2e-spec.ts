import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';

describe('Regions (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/regions/provinces -> 200, 38 provinsi, publik (tanpa cookie)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/regions/provinces')
      .expect(200);
    expect(res.body.data).toHaveLength(38);
  });

  it('GET /api/regions/regencies tanpa provinceCode -> 400', () => {
    return request(app.getHttpServer())
      .get('/api/regions/regencies')
      .expect(400);
  });

  it('cascade provinsi -> kab/kota -> kecamatan -> kelurahan (Jawa Barat -> Kota Bandung -> Sukasari)', async () => {
    const server = app.getHttpServer();

    const regencies = await request(server)
      .get('/api/regions/regencies')
      .query({ provinceCode: '32' })
      .expect(200);
    const bandung = regencies.body.data.find(
      (r: { code: string }) => r.code === '32.73',
    );
    expect(bandung).toMatchObject({ name: 'Kota Bandung', type: 'kota' });

    const districts = await request(server)
      .get('/api/regions/districts')
      .query({ regencyCode: '32.73' })
      .expect(200);
    const sukasari = districts.body.data.find(
      (d: { code: string }) => d.code === '32.73.01',
    );
    expect(sukasari).toMatchObject({ name: 'Sukasari' });

    const villages = await request(server)
      .get('/api/regions/villages')
      .query({ districtCode: '32.73.01' })
      .expect(200);
    expect(villages.body.data.length).toBeGreaterThan(0);
    for (const v of villages.body.data) {
      expect(v.postalCode).toBeTruthy();
    }
  });

  it('GET /api/regions/search?q=bandung&level=regency -> hasil memuat Kota Bandung', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/regions/search')
      .query({ q: 'bandung', level: 'regency' })
      .expect(200);
    expect(
      res.body.data.some((r: { code: string }) => r.code === '32.73'),
    ).toBe(true);
  });
});
