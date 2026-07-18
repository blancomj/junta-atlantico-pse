import { UserType, IdentificationType } from './payment';

export type TransactionState = 'OK' | 'NOT_AUTHORIZED' | 'PENDING' | 'FAILED';
export type FinalState = 'OK' | 'NOT_AUTHORIZED' | 'FAILED';

export interface TransactionRecord {
  id: string;
  ticket_id_encrypted: string;
  trazability_code: string;
  transaction_state: TransactionState;
  amount: number;
  user_email_encrypted?: string;
  identification_number_encrypted?: string;
  full_name_encrypted?: string;
  payment_mode?: number;
  payment_origin?: number;
  service_nit?: string;
  service_name?: string;
  cause_rejection?: string;
  state_description?: string;
  rejection_description?: string;
  recaptcha_score?: number;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionStatusResponse {
  returnCode: string;
  trazabilityCode: string;
  ticketId?: number | string;
  transactionState: TransactionState;
  transactionValue?: number;
  vatValue?: number;
  bankProcessDate?: string;
  authorizationID?: string;
  serviceNIT?: string;
  serviceName?: string;
  paymentOrigin?: number;
  paymentMode?: number;
  userType?: UserType;
  identificationType?: IdentificationType;
  identificationNumber?: string;
  fullName?: string;
  email?: string;
}

export interface DetailedTransactionResponse extends TransactionStatusResponse {
  causeRejection?: string;
  rejectionDescription?: string;
  stateDescription?: string;
}
