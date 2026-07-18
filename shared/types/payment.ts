export type UserType = 'person' | 'company';

export type IdentificationType =
  | 'RegistroCivilDeNacimiento'
  | 'TarjetaDeIdentidad'
  | 'CedulaDeCiudadania'
  | 'TarjetaDeExtranjeria'
  | 'CedulaDeExtranjeria'
  | 'Pasaporte'
  | 'DocumentoDeIdentificacionExtranjero'
  | 'NIT';

export type BeneficiaryIdentificationType =
  | 'CedulaDeCiudadania'
  | 'CedulaDeExtranjeria'
  | 'Pasaporte'
  | 'DocumentoDeIdentificacionExtranjero'
  | 'NIT'
  | 'IdentificacionComercioExtranjero';

export interface PaymentData {
  bankCode: string;
  amount: number;
  vat?: number;
  serviceCode?: string;
  userType: UserType;
  identificationType: IdentificationType;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  email: string;
  address: string;
  description: string;
  ticketId?: number | string;
  reference1?: string;
  reference2?: string;
  reference3?: string;
  indicator4per1000?: number;
  recaptchaToken?: string;
}

export interface PSETransactionPayload {
  entityCode: string;
  serviceCode: string;
  financialInstitutionCode: string;
  transactionValue: number;
  vatValue: number;
  ticketId: number | string;
  entityurl: string;
  userType: UserType;
  soliciteDate: string;
  paymentDescription: string;
  referenceNumber1: string;
  referenceNumber2: string;
  referenceNumber3: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  address: string;
  email: string;
  beneficiaryEntityIdentificationType: string;
  beneficiaryEntityIdentification: string;
  beneficiaryEntityName: string;
  beneficiaryEntityCIIUCategory: string;
  beneficiaryIdentificationType: IdentificationType;
  beneficiaryIdentification: string;
  indicator4per1000: number;
}
