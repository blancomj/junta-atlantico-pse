export interface BatchPayment {
  id: string;
  entity_id: string;
  user_id: string;
  file_name: string;
  estado: 'por_pagar' | 'pagado' | 'anulado';
  total_beneficiarios: number;
  monto_total: number;
  trazability_code?: string;
  pse_url?: string;
  banco_pago?: string;
  documento_pago?: string;
  fecha_pago?: Date;
  motivo_anulacion?: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface BatchPaymentBeneficiary {
  id: string;
  batch_payment_id: string;
  numero_identificacion: string;
  nombre: string;
  numero_expediente: string;
  valor: number;
  estado: 'pendiente' | 'pagado';
  created_at: Date;
}

export interface BatchPaymentAttempt {
  id: string;
  batch_payment_id: string;
  trazability_code?: string;
  estado: 'exitoso' | 'fallido';
  mensaje?: string;
  banco?: string;
  created_at: Date;
}

export interface ExcelRow {
  NUMERO_IDENTIFICACION: string;
  NOMBRE: string;
  NUMERO_EXPEDIENTE: string;
  VALOR: number;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  totalBeneficiarios: number;
  montoTotal: number;
  preview: ExcelRow[];
}

export interface ValidationError {
  row: number | null;
  field: string;
  message: string;
}

export interface BatchPaymentListQuery {
  page?: number;
  pageSize?: number;
  estado?: string;
  userId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface BatchPaymentListResponse {
  data: BatchPayment[];
  total: number;
  page: number;
  pageSize: number;
}