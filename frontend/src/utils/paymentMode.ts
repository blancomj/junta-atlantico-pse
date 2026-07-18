export const PAYMENT_MODE_LABELS: Record<number, string> = {
  15: 'Debito en cuenta',
  50: 'Tarjeta de Credito Visa',
  51: 'Tarjeta de Credito MasterCard',
  52: 'Tarjeta de Credito Diners Club',
  53: 'Tarjeta de Credito Propia de la Entidad Financiera',
  54: 'Credito Rotativo',
  55: 'Tarjeta de Credito American Express',
  56: 'Tarjeta de Credito Propia del Comercio'
};

export const PAYMENT_ORIGIN_LABELS: Record<number, string> = {
  3: 'Debito',
  4: 'Credito'
};

export function getPaymentModeLabel(code: number): string {
  return PAYMENT_MODE_LABELS[code] || `Modo ${code}`;
}

export function getPaymentOriginLabel(code: number): string {
  return PAYMENT_ORIGIN_LABELS[code] || `Origen ${code}`;
}
