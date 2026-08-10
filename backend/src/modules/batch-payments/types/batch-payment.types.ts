export interface BatchPayment {
  id: string;
  entity_id: string | null;
  user_id: string | null;
  tipo: 'individual' | 'lote';
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
  /** Solo presente en list() cuando tipo='individual': documento del paciente (unico beneficiario) */
  beneficiary_documento?: string;
}

export interface BatchPaymentBeneficiary {
  id: string;
  batch_payment_id: string;
  numero_identificacion: string;
  nombre: string;
  numero_expediente: string | null;
  valor: number;
  estado: 'pendiente' | 'pagado';
  created_at: Date;
}

export interface IndividualPaymentData {
  patientId: string;
  patientName: string;
  payerAddress: string;
  payerPhone: string;
  amount: number;
  trazabilityCode: string;
  bancoPago: string;
  documentoPago: string;
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
  tipo?: string;
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