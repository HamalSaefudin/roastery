import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';
import type {
  CreateTransactionParams,
  ParsedWebhook,
  PaymentInstruction,
  PaymentProvider,
} from './payment-provider.interface';

interface MockWebhookBody {
  providerRef: string;
  status: 'paid' | 'failed' | 'pending';
}

/**
 * Provider "internal" — dipilih Midtrans sbg target real-world (kandidat paling umum di Indonesia,
 * dukungan VA/QRIS/e-wallet lengkap), TAPI belum ada kredensial gateway sungguhan di env dev ini.
 * Implementasi ini mensimulasikan alur create-transaction + webhook signature verification supaya
 * checkout/webhook Orders↔Payments bisa dibangun & diuji end-to-end sekarang. Tinggal ganti binding
 * PAYMENT_PROVIDER ke `MidtransProvider` (implementasi `midtrans-client`) begitu kredensial tersedia —
 * PaymentsService tidak perlu berubah sama sekali (itu tujuan seam `PaymentProvider`).
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'internal';

  constructor(private readonly config: ConfigService) {}

  createTransaction(
    params: CreateTransactionParams,
  ): Promise<{ providerRef: string; instruction: PaymentInstruction }> {
    const providerRef = `MOCK-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const method = params.method ?? 'qris';

    let instruction: PaymentInstruction;
    if (method === 'va') {
      instruction = {
        type: 'va',
        redirectUrl: null,
        qrString: null,
        vaNumber: `8808${Math.floor(Math.random() * 1_000_000_000)}`,
        expiresAt,
      };
    } else if (method === 'qris') {
      instruction = {
        type: 'qris',
        redirectUrl: null,
        qrString: `mock-qris://${providerRef}`,
        vaNumber: null,
        expiresAt,
      };
    } else {
      instruction = {
        type: 'redirect',
        redirectUrl: `https://mock-gateway.local/pay/${providerRef}`,
        qrString: null,
        vaNumber: null,
        expiresAt,
      };
    }

    return Promise.resolve({ providerRef, instruction });
  }

  verifyWebhook(headers: Record<string, string>, rawBody: unknown): boolean {
    const signature = headers['x-mock-signature'];
    if (!signature) {
      return false;
    }
    const secret = this.config.getOrThrow<string>('PAYMENT_SERVER_KEY');
    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(rawBody))
      .digest('hex');
    return signature === expected;
  }

  parseWebhook(rawBody: unknown): ParsedWebhook {
    const body = rawBody as MockWebhookBody;
    return { providerRef: body.providerRef, status: body.status };
  }
}
