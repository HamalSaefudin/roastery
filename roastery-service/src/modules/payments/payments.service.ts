import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constants';
import type {
  DrizzleDB,
  DrizzleDbOrTx,
} from '../../database/drizzle.constants';
import { nextCode } from '../../common/sequence.util';
import { customerProfiles } from '../customers/customers.schema';
import { orders } from '../orders/orders.schema';
import { OrdersService } from '../orders/orders.service';
import { invoices, payments, refunds } from './payments.schema';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './providers/payment-provider.interface';
import type { CreatePaymentCheckoutDto, RefundDto } from './dto/payment.dto';
import type { CreateInvoiceDto } from './dto/invoice.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  async checkout(
    orderId: string,
    dto: CreatePaymentCheckoutDto,
    userId: string,
  ) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }
    const profile = await this.db.query.customerProfiles.findFirst({
      where: eq(customerProfiles.userId, userId),
    });
    if (!profile || order.customerId !== profile.id) {
      throw new NotFoundException('Order tidak ditemukan');
    }
    if (order.paymentType !== 'prepaid') {
      throw new ConflictException(
        'Order ini pakai jalur invoice, bukan checkout gateway',
      );
    }

    const existing = await this.db.query.payments.findFirst({
      where: eq(payments.orderId, orderId),
      orderBy: desc(payments.createdAt),
    });
    if (existing?.method === 'cod') {
      throw new ConflictException('Order COD tidak butuh pembayaran gateway');
    }
    if (order.status !== 'created') {
      throw new ConflictException('Order sudah dibayar/diproses');
    }
    if (existing && existing.status === 'pending') {
      const { providerRef, instruction } =
        await this.provider.createTransaction({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.total,
          method: dto.method,
        });
      const [payment] = await this.db
        .update(payments)
        .set({ providerRef, method: dto.method ?? existing.method })
        .where(eq(payments.id, existing.id))
        .returning();
      return { payment, paymentInstruction: instruction };
    }

    const { providerRef, instruction } = await this.provider.createTransaction({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      method: dto.method,
    });

    const payment = await this.db.transaction(async (tx) => {
      const paymentNumber = await nextCode(tx, {
        prefix: 'PAY',
        scope: 'daily',
        width: 4,
        counter: 'payment',
      });
      const [row] = await tx
        .insert(payments)
        .values({
          paymentNumber,
          orderId: order.id,
          provider: this.provider.name,
          providerRef,
          method: dto.method ?? 'qris',
          amount: order.total,
          status: 'pending',
        })
        .returning();
      return row;
    });

    return { payment, paymentInstruction: instruction };
  }

  async handleWebhook(headers: Record<string, string>, rawBody: unknown) {
    const verified = this.provider.verifyWebhook(headers, rawBody);
    if (!verified) {
      throw new UnauthorizedException('Signature tidak valid');
    }
    const parsed = this.provider.parseWebhook(rawBody);

    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.providerRef, parsed.providerRef),
    });
    if (!payment) {
      return { received: true };
    }
    if (payment.status === 'paid') {
      return { received: true };
    }

    if (parsed.status === 'paid') {
      await this.db.transaction(async (tx) => {
        await tx
          .update(payments)
          .set({ status: 'paid', paidAt: new Date() })
          .where(eq(payments.id, payment.id));
        await this.ordersService.changeStatus(
          payment.orderId,
          'paid',
          null,
          undefined,
          tx,
        );
      });
    } else if (parsed.status === 'failed') {
      await this.db
        .update(payments)
        .set({ status: 'failed' })
        .where(eq(payments.id, payment.id));
    }

    return { received: true };
  }

  async getByOrderId(orderId: string, userId: string, isStaff: boolean) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }
    if (!isStaff) {
      const profile = await this.db.query.customerProfiles.findFirst({
        where: eq(customerProfiles.userId, userId),
      });
      if (!profile || order.customerId !== profile.id) {
        throw new NotFoundException('Order tidak ditemukan');
      }
    }
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.orderId, orderId),
      orderBy: desc(payments.createdAt),
    });
    if (!payment) {
      throw new NotFoundException('Pembayaran belum dibuat untuk order ini');
    }
    return payment;
  }

  async refund(paymentId: string, dto: RefundDto) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment) {
      throw new NotFoundException('Pembayaran tidak ditemukan');
    }
    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      throw new ConflictException(
        'Refund hanya untuk pembayaran yang sudah lunas',
      );
    }

    const [sumRow] = await this.db
      .select({ total: sql<number>`coalesce(sum(${refunds.amount}), 0)::int` })
      .from(refunds)
      .where(eq(refunds.paymentId, paymentId));
    const alreadyRefunded = sumRow?.total ?? 0;
    const refundAmount = dto.amount ?? payment.amount - alreadyRefunded;

    if (refundAmount <= 0 || alreadyRefunded + refundAmount > payment.amount) {
      throw new BadRequestException(
        'Jumlah refund melebihi nominal pembayaran',
      );
    }

    return this.db.transaction(async (tx) => {
      const refundNumber = await nextCode(tx, {
        prefix: 'RFD',
        scope: 'daily',
        width: 3,
        counter: 'refund',
      });
      const [refund] = await tx
        .insert(refunds)
        .values({
          refundNumber,
          paymentId,
          amount: refundAmount,
          reason: dto.reason,
          status: 'done',
        })
        .returning();

      const newStatus =
        alreadyRefunded + refundAmount >= payment.amount
          ? 'refunded'
          : 'partially_refunded';
      const [updatedPayment] = await tx
        .update(payments)
        .set({ status: newStatus })
        .where(eq(payments.id, paymentId))
        .returning();

      return { refund, payment: updatedPayment };
    });
  }

  async createInvoice(dto: CreateInvoiceDto) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, dto.orderId),
    });
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }
    if (order.paymentType !== 'invoice') {
      throw new BadRequestException(
        'Order ini bukan jalur invoice (wholesale)',
      );
    }

    return this.db.transaction(async (tx) => {
      const invoiceNumber = await nextCode(tx, {
        prefix: 'INV',
        scope: 'monthly',
        width: 4,
        counter: 'invoice',
      });
      const [invoice] = await tx
        .insert(invoices)
        .values({
          orderId: order.id,
          invoiceNumber,
          amount: order.total,
          dueDate: dto.dueDate,
          status: 'issued',
        })
        .returning();
      return invoice;
    });
  }

  async payInvoice(id: string) {
    const invoice = await this.db.query.invoices.findFirst({
      where: eq(invoices.id, id),
    });
    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }
    if (invoice.status === 'paid') {
      throw new ConflictException('Invoice sudah lunas');
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(invoices)
        .set({ status: 'paid', paidAt: new Date() })
        .where(eq(invoices.id, id))
        .returning();
      await this.ordersService.changeStatus(
        invoice.orderId,
        'paid',
        null,
        undefined,
        tx,
      );
      return updated;
    });
  }

  // --- COD (dipanggil Orders saat checkout & Delivery saat driver terima uang, via DI) ---

  async createCodPayment(
    orderId: string,
    amount: number,
    tx: DrizzleDbOrTx = this.db,
  ) {
    const paymentNumber = await nextCode(tx, {
      prefix: 'PAY',
      scope: 'daily',
      width: 4,
      counter: 'payment',
    });
    const [payment] = await tx
      .insert(payments)
      .values({
        paymentNumber,
        orderId,
        provider: 'internal',
        method: 'cod',
        amount,
        status: 'pending',
      })
      .returning();
    return payment;
  }

  async markCodPaid(orderId: string, tx: DrizzleDbOrTx = this.db) {
    const payment = await tx.query.payments.findFirst({
      where: eq(payments.orderId, orderId),
    });
    if (!payment || payment.method !== 'cod') {
      throw new NotFoundException(
        'Pembayaran COD untuk order ini tidak ditemukan',
      );
    }
    await tx
      .update(payments)
      .set({ status: 'paid', paidAt: new Date() })
      .where(eq(payments.id, payment.id));
  }

  // --- Scheduled job: tandai invoice lewat jatuh tempo (Fase 7, konvensi §19) ---

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async markOverdueInvoices() {
    const overdue = await this.db
      .update(invoices)
      .set({ status: 'overdue' })
      .where(
        and(
          eq(invoices.status, 'issued'),
          sql`${invoices.dueDate} < current_date`,
        ),
      )
      .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

    if (overdue.length > 0) {
      this.logger.log(
        `Menandai ${overdue.length} invoice sebagai overdue: ${overdue.map((i) => i.invoiceNumber).join(', ')}`,
      );
    }
    return overdue;
  }
}
