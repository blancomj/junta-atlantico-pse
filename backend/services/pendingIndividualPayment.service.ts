// Cache temporal de datos de formulario de pago individual, keyed por
// trazabilityCode (CUS). Se guarda al crear la transaccion PSE y se consume
// (y borra) cuando el polling confirma estado OK, momento en el que se
// registra el pago en batch_payments/batch_payment_beneficiaries.
// Mismo patron que excel-parser.service.ts (Map en memoria + TTL + limpieza periodica).

export interface PendingIndividualPayment {
  patientId: string;
  patientName: string;
  payerAddress: string;
  payerPhone: string;
  amount: number;
  description: string;
  bankCode: string;
}

const cache = new Map<string, { data: PendingIndividualPayment; expiresAt: number }>();
const TTL_MS = 2 * 60 * 60 * 1000; // 2 horas: cubre polling (hasta 30 min) + margen
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

export default {
  set(trazabilityCode: string, data: PendingIndividualPayment): void {
    cache.set(trazabilityCode, { data, expiresAt: Date.now() + TTL_MS });
  },

  consume(trazabilityCode: string): PendingIndividualPayment | null {
    const entry = cache.get(trazabilityCode);
    cache.delete(trazabilityCode);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.data;
  },

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now > value.expiresAt) cache.delete(key);
    }
  },

  startCleanup(): void {
    if (cleanupTimer) return;
    cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    if (cleanupTimer.unref) cleanupTimer.unref();
  },

  stopCleanup(): void {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }
};
