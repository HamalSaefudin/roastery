import { INestApplication } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE } from '../src/database/drizzle.constants';
import type { DrizzleDB } from '../src/database/drizzle.constants';
import { users } from '../src/modules/auth/auth.schema';
import { products } from '../src/modules/catalog/catalog.schema';
import { customerProfiles } from '../src/modules/customers/customers.schema';
import { deliveryZones } from '../src/modules/delivery/zones/zones.schema';
import { deliveries } from '../src/modules/delivery/dispatch/dispatch.schema';
import { invoices } from '../src/modules/payments/payments.schema';
import type { PaymentsService } from '../src/modules/payments/payments.service';
import { createTestApp } from './utils/test-app';
import { extractCookies } from './utils/cookies';

const PAYMENT_SERVER_KEY = 'dev-mock-payment-server-key-not-for-production';

function sign(body: unknown): string {
  return createHmac('sha256', PAYMENT_SERVER_KEY)
    .update(JSON.stringify(body))
    .digest('hex');
}

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  const server = () => app.getHttpServer();

  const runId = Date.now();
  const password = 'password123';
  const staffEmail = `staff-payments-e2e-${runId}@example.com`;
  const custEmail = `cust-payments-e2e-${runId}@example.com`;
  const wsEmail = `ws-payments-e2e-${runId}@example.com`;

  let staffCookies: string[];
  let custCookies: string[];
  let wsCookies: string[];

  let beanId: string;
  let variantId: string;

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
    await request(server())
      .get('/api/customers/me')
      .set('Cookie', wsCookies)
      .expect(200);
    const [wsUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, wsEmail));
    await db
      .update(customerProfiles)
      .set({ customerType: 'wholesale' })
      .where(eq(customerProfiles.userId, wsUser.id));

    const beanRes = await request(server())
      .post('/api/catalog/products')
      .set('Cookie', staffCookies)
      .send({
        type: 'bean',
        name: `Payments Test Bean ${runId}`,
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
      .send({ variantId, price: 30000 })
      .expect(201);
    await request(server())
      .patch(`/api/inventory/bean-stock/${variantId}`)
      .set('Cookie', staffCookies)
      .send({ quantity: 50, reason: 'purchase' })
      .expect(200);
  });

  afterAll(async () => {
    await db.delete(products).where(eq(products.id, beanId));
    await db
      .delete(users)
      .where(inArray(users.email, [staffEmail, custEmail, wsEmail]));
    await app.close();
  });

  async function checkoutPickupOrder(cookies: string[]) {
    await request(server())
      .post('/api/orders/cart/items')
      .set('Cookie', cookies)
      .send({ variantId, quantity: 1 })
      .expect(201);
    const res = await request(server())
      .post('/api/orders/checkout')
      .set('Cookie', cookies)
      .send({ fulfillmentMethod: 'pickup', paymentMethod: 'online' })
      .expect(201);
    return res.body.order.id as string;
  }

  describe('POST /payments/checkout + webhook', () => {
    let orderId: string;
    let providerRef: string;

    it('checkout order lain -> 404', () => {
      return request(server())
        .post('/api/payments/checkout')
        .set('Cookie', custCookies)
        .send({ orderId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('POST /payments/checkout -> 201, instruksi qris', async () => {
      orderId = await checkoutPickupOrder(custCookies);
      const res = await request(server())
        .post('/api/payments/checkout')
        .set('Cookie', custCookies)
        .send({ orderId, method: 'qris' })
        .expect(201);
      expect(res.body.payment).toMatchObject({
        status: 'pending',
        amount: 30000,
        method: 'qris',
      });
      expect(res.body.paymentInstruction.type).toBe('qris');
      expect(res.body.payment.paymentNumber).toMatch(/^PAY-\d{8}-\d{4}$/);
      providerRef = res.body.payment.providerRef;
    });

    it('checkout lagi sebelum bayar -> reuse payment lama (id sama), bukan bikin baru', async () => {
      const before = await request(server())
        .get(`/api/payments/order/${orderId}`)
        .set('Cookie', custCookies)
        .expect(200);
      const res = await request(server())
        .post('/api/payments/checkout')
        .set('Cookie', custCookies)
        .send({ orderId })
        .expect(201);
      expect(res.body.payment.id).toBe(before.body.payment.id);
      expect(res.body.payment.paymentNumber).toMatch(/^PAY-\d{8}-\d{4}$/);
      // Provider dipanggil ulang -> providerRef baru; sinkronkan variabel test dgn state DB terkini.
      providerRef = res.body.payment.providerRef;
    });

    it('GET /payments/order/:orderId -> 200', async () => {
      const res = await request(server())
        .get(`/api/payments/order/${orderId}`)
        .set('Cookie', custCookies)
        .expect(200);
      expect(res.body.payment.status).toBe('pending');
    });

    it('webhook signature invalid -> 401', () => {
      const body = { providerRef, status: 'paid' };
      return request(server())
        .post('/api/payments/webhook')
        .send(body)
        .set('x-mock-signature', 'salah')
        .expect(401);
    });

    it('webhook valid -> 200, order jadi paid', async () => {
      const body = { providerRef, status: 'paid' };
      await request(server())
        .post('/api/payments/webhook')
        .send(body)
        .set('x-mock-signature', sign(body))
        .expect(200);

      const orderRes = await request(server())
        .get(`/api/orders/${orderId}`)
        .set('Cookie', custCookies)
        .expect(200);
      expect(orderRes.body.order.status).toBe('paid');
    });

    it('webhook idempotent (kirim lagi) -> 200 tanpa efek', () => {
      const body = { providerRef, status: 'paid' };
      return request(server())
        .post('/api/payments/webhook')
        .send(body)
        .set('x-mock-signature', sign(body))
        .expect(200);
    });

    it('webhook providerRef tidak dikenal -> 200 (bukan 404)', () => {
      const body = { providerRef: 'MOCK-tidak-ada', status: 'paid' };
      return request(server())
        .post('/api/payments/webhook')
        .send(body)
        .set('x-mock-signature', sign(body))
        .expect(200);
    });

    it('checkout order yg sudah paid -> 409', () => {
      return request(server())
        .post('/api/payments/checkout')
        .set('Cookie', custCookies)
        .send({ orderId })
        .expect(409);
    });
  });

  describe('COD order tidak lewat gateway', () => {
    it('checkout COD -> payments/checkout 409', async () => {
      const zoneRes = await request(server())
        .post('/api/delivery/zones')
        .set('Cookie', staffCookies)
        .send({
          name: `Zona Pay ${runId}`,
          districtCodes: ['32.73.01'],
          fee: 5000,
        })
        .expect(201);

      const addrRes = await request(server())
        .post('/api/customers/me/addresses')
        .set('Cookie', custCookies)
        .send({
          label: 'CodAddr',
          recipientName: 'Budi',
          phone: '08111',
          line1: 'Jl. Cod',
          provinceCode: '32',
          regencyCode: '32.73',
          districtCode: '32.73.01',
          villageCode: '32.73.01.1001',
        })
        .expect(201);

      await request(server())
        .post('/api/orders/cart/items')
        .set('Cookie', custCookies)
        .send({ variantId, quantity: 1 })
        .expect(201);
      const orderRes = await request(server())
        .post('/api/orders/checkout')
        .set('Cookie', custCookies)
        .send({
          fulfillmentMethod: 'delivery',
          paymentMethod: 'cod',
          addressId: addrRes.body.address.id,
        })
        .expect(201);

      const codOrderId = orderRes.body.order.id;
      const codPayment = await request(server())
        .get(`/api/payments/order/${codOrderId}`)
        .set('Cookie', custCookies)
        .expect(200);
      expect(codPayment.body.payment.method).toBe('cod');
      expect(codPayment.body.payment.status).toBe('pending');

      await request(server())
        .post('/api/payments/checkout')
        .set('Cookie', custCookies)
        .send({ orderId: codOrderId })
        .expect(409);

      await db.delete(deliveries).where(eq(deliveries.orderId, codOrderId));
      await db
        .delete(deliveryZones)
        .where(eq(deliveryZones.id, zoneRes.body.zone.id));
    });
  });

  describe('Refund', () => {
    let orderId: string;
    let paymentId: string;

    beforeAll(async () => {
      orderId = await checkoutPickupOrder(custCookies);
      const payRes = await request(server())
        .post('/api/payments/checkout')
        .set('Cookie', custCookies)
        .send({ orderId })
        .expect(201);
      paymentId = payRes.body.payment.id;
      const body = {
        providerRef: payRes.body.payment.providerRef,
        status: 'paid',
      };
      await request(server())
        .post('/api/payments/webhook')
        .send(body)
        .set('x-mock-signature', sign(body))
        .expect(200);
    });

    it('retail tidak bisa refund -> 403', () => {
      return request(server())
        .post(`/api/payments/${paymentId}/refund`)
        .set('Cookie', custCookies)
        .send({})
        .expect(403);
    });

    it('refund sebagian -> partially_refunded', async () => {
      const res = await request(server())
        .post(`/api/payments/${paymentId}/refund`)
        .set('Cookie', staffCookies)
        .send({ amount: 10000, reason: 'sebagian' })
        .expect(201);
      expect(res.body.refund.amount).toBe(10000);
      expect(res.body.payment.status).toBe('partially_refunded');
      expect(res.body.refund.refundNumber).toMatch(/^RFD-\d{8}-\d{3}$/);
    });

    it('refund sisanya (tanpa amount = full) -> refunded', async () => {
      const res = await request(server())
        .post(`/api/payments/${paymentId}/refund`)
        .set('Cookie', staffCookies)
        .send({})
        .expect(201);
      expect(res.body.payment.status).toBe('refunded');
    });

    it('refund lagi setelah full-refunded -> 409', () => {
      return request(server())
        .post(`/api/payments/${paymentId}/refund`)
        .set('Cookie', staffCookies)
        .send({})
        .expect(409);
    });
  });

  describe('Invoice (wholesale)', () => {
    let orderId: string;
    let invoiceId: string;

    beforeAll(async () => {
      orderId = await checkoutPickupOrder(wsCookies);
    });

    it('POST invoice utk order retail (prepaid) -> 400', async () => {
      const retailOrderId = await checkoutPickupOrder(custCookies);
      return request(server())
        .post('/api/payments/invoices')
        .set('Cookie', staffCookies)
        .send({ orderId: retailOrderId, dueDate: '2026-08-01' })
        .expect(400);
    });

    it('POST invoice -> 201', async () => {
      const res = await request(server())
        .post('/api/payments/invoices')
        .set('Cookie', staffCookies)
        .send({ orderId, dueDate: '2026-08-01' })
        .expect(201);
      expect(res.body.invoice.status).toBe('issued');
      expect(res.body.invoice.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
      invoiceId = res.body.invoice.id;
    });

    it('PATCH invoice/:id/pay -> 200, order jadi paid', async () => {
      const res = await request(server())
        .patch(`/api/payments/invoices/${invoiceId}/pay`)
        .set('Cookie', staffCookies)
        .expect(200);
      expect(res.body.invoice.status).toBe('paid');

      const orderRes = await request(server())
        .get(`/api/orders/${orderId}`)
        .set('Cookie', wsCookies)
        .expect(200);
      expect(orderRes.body.order.status).toBe('paid');
    });

    it('PATCH invoice/:id/pay lagi -> 409', () => {
      return request(server())
        .patch(`/api/payments/invoices/${invoiceId}/pay`)
        .set('Cookie', staffCookies)
        .expect(409);
    });
  });

  describe('Job overdue invoice (Cron, dipanggil langsung via DI)', () => {
    let overdueOrderId: string;
    let overdueInvoiceId: string;
    let futureOrderId: string;
    let futureInvoiceId: string;
    let paymentsService: PaymentsService;

    beforeAll(async () => {
      // import dinamis (bukan static import di atas) supaya modul ini baru
      // ter-load SETELAH createTestApp() selesai — payments.service.ts,
      // orders.service.ts, dan dispatch.service.ts saling import satu sama
      // lain (circular), static import di top-level file akan jadi entry
      // point pertama ke siklus itu dan bikin DispatchService gagal resolve
      // PaymentsService saat DI (module belum selesai inisialisasi).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../src/modules/payments/payments.service') as {
        PaymentsService: new (...args: unknown[]) => PaymentsService;
      };
      paymentsService = app.get(mod.PaymentsService);

      overdueOrderId = await checkoutPickupOrder(wsCookies);
      const overdueRes = await request(server())
        .post('/api/payments/invoices')
        .set('Cookie', staffCookies)
        .send({ orderId: overdueOrderId, dueDate: '2026-08-01' })
        .expect(201);
      overdueInvoiceId = overdueRes.body.invoice.id;
      // paksa due_date ke masa lalu langsung via DB — cara yang sama dipakai
      // utk trigger state promo (starts_at/ends_at) di pricing.e2e-spec.ts
      await db
        .update(invoices)
        .set({ dueDate: '2020-01-01' })
        .where(eq(invoices.id, overdueInvoiceId));

      futureOrderId = await checkoutPickupOrder(wsCookies);
      const futureRes = await request(server())
        .post('/api/payments/invoices')
        .set('Cookie', staffCookies)
        .send({ orderId: futureOrderId, dueDate: '2099-01-01' })
        .expect(201);
      futureInvoiceId = futureRes.body.invoice.id;
    });

    it('markOverdueInvoices() -> hanya invoice issued+lewat jatuh tempo yg jadi overdue', async () => {
      const result = await paymentsService.markOverdueInvoices();
      expect(result.some((i) => i.id === overdueInvoiceId)).toBe(true);
      expect(result.some((i) => i.id === futureInvoiceId)).toBe(false);

      const overdue = await db.query.invoices.findFirst({
        where: eq(invoices.id, overdueInvoiceId),
      });
      expect(overdue?.status).toBe('overdue');

      const future = await db.query.invoices.findFirst({
        where: eq(invoices.id, futureInvoiceId),
      });
      expect(future?.status).toBe('issued');
    });

    it('invoice yg sudah paid tidak ikut ditandai overdue meski due_date lewat', async () => {
      await request(server())
        .patch(`/api/payments/invoices/${futureInvoiceId}/pay`)
        .set('Cookie', staffCookies)
        .expect(200);
      await db
        .update(invoices)
        .set({ dueDate: '2020-01-01' })
        .where(eq(invoices.id, futureInvoiceId));

      await paymentsService.markOverdueInvoices();

      const paid = await db.query.invoices.findFirst({
        where: eq(invoices.id, futureInvoiceId),
      });
      expect(paid?.status).toBe('paid');
    });
  });
});
