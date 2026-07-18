import { TransactionState } from '../../shared/types/transaction';
import { UserType, IdentificationType } from '../../shared/types/payment';
import { PSEReturnCode } from '../../shared/types/pse-api';

export const COMPANY = {
  NIT: '901234567-8',
  NAME: 'JUNTA ATLANTICO S.A.S.',
  CIIU: '8692',
  ENTITY_CODE: '901234567-8'
} as const;

export const VALID_ID_TYPES: IdentificationType[] = [
  'RegistroCivilDeNacimiento',
  'TarjetaDeIdentidad',
  'CedulaDeCiudadania',
  'TarjetaDeExtranjeria',
  'CedulaDeExtranjeria',
  'Pasaporte',
  'DocumentoDeIdentificacionExtranjero',
  'NIT'
];

export const VALID_BENEFICIARY_ID_TYPES = [
  'CedulaDeCiudadania',
  'CedulaDeExtranjeria',
  'Pasaporte',
  'DocumentoDeIdentificacionExtranjero',
  'NIT',
  'IdentificacionComercioExtranjero'
] as const;

export const USER_TYPES: UserType[] = ['person', 'company'];

export const TRANSACTION_STATES: Record<string, TransactionState> = {
  OK: 'OK',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  PENDING: 'PENDING',
  FAILED: 'FAILED'
};

export const FINAL_STATES: TransactionState[] = ['OK', 'NOT_AUTHORIZED', 'FAILED'];

export const FORBIDDEN_CHARS_REGEX: RegExp = /[|"]/;

export const RECAPTCHA_ACTIONS = {
  PAYMENT: 'pse_payment',
  BANK_LIST: 'pse_bank_list'
} as const;
