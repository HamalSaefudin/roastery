export interface PaymentInstruction {
  type: 'redirect' | 'qris' | 'va';
  redirectUrl: string | null;
  qrString: string | null;
  vaNumber: string | null;
  expiresAt: string;
}

export interface CreateTransactionParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  method?: string;
}

export interface ParsedWebhook {
  providerRef: string;
  status: 'paid' | 'failed' | 'pending';
}

/**
 * Seam provider-agnostic (konvensi §1 modul 07): PaymentsService cuma bicara ke interface ini,
 * TIDAK pernah import SDK gateway langsung. Implementasi konkret di-bind via DI token PAYMENT_PROVIDER.
 */
export interface PaymentProvider {
  readonly name: string;
  createTransaction(
    params: CreateTransactionParams,
  ): Promise<{ providerRef: string; instruction: PaymentInstruction }>;
  verifyWebhook(headers: Record<string, string>, rawBody: unknown): boolean;
  parseWebhook(rawBody: unknown): ParsedWebhook;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
