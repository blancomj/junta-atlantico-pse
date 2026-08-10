export interface BatchPayment {
  id: string;
  entity_id: string | null;
  user_id: string | null;
  tipo: 'individual' | 'lote';
  user_name?: string;
  /** Solo presente cuando tipo='individual': documento del paciente (unico beneficiario) */
  beneficiary_documento?: string;
  file_name: string;
  direccion?: string;
  telefono?: string;
  estado: 'por_pagar' | 'pagado' | 'anulado';
  total_beneficiarios: number;
  monto_total: number;
  trazability_code?: string;
  banco_pago?: string;
  documento_pago?: string;
  fecha_pago?: string;
  motivo_anulacion?: string;
  created_at: string;
  beneficiaries?: BatchPaymentBeneficiary[];
}

export interface BatchPaymentBeneficiary {
  id: string;
  numero_identificacion: string;
  nombre: string;
  numero_expediente: string | null;
  valor: number;
  estado: 'pendiente' | 'pagado';
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  totalBeneficiarios: number;
  montoTotal: number;
  preview: {
    NUMERO_IDENTIFICACION: string;
    NOMBRE: string;
    NUMERO_EXPEDIENTE: string;
    VALOR: number;
  }[];
}

export interface ValidationError {
  row: number | null;
  field: string;
  message: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  nit: string;
  direccion: string;
  telefono: string;
  role: 'admin' | 'user';
  entityName: string;
  mustChangePassword: boolean;
}
