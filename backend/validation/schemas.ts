import { z } from 'zod';

const UserTypeEnum = z.enum(['person', 'company']);

const IdentificationTypeEnum = z.enum([
  'RegistroCivilDeNacimiento',
  'TarjetaDeIdentidad',
  'CedulaDeCiudadania',
  'TarjetaDeExtranjeria',
  'CedulaDeExtranjeria',
  'Pasaporte',
  'DocumentoDeIdentificacionExtranjero',
  'NIT'
]);

export const createTransactionSchema = z.object({
  bankCode: z.string().min(1, 'Codigo de banco requerido'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  userType: UserTypeEnum,
  identificationType: IdentificationTypeEnum,
  identificationNumber: z.string().min(1, 'Numero de identificacion requerido'),
  fullName: z.string().min(1, 'Nombre completo requerido').max(200),
  cellphoneNumber: z.string().regex(/^\d{10}$/, 'El celular debe tener 10 digitos'),
  email: z.string().email('Email invalido'),
  address: z.string().min(1, 'Direccion requerida').max(200),
  description: z.string().min(1, 'Descripcion requerida').max(80),
  reference1: z.string().max(80).optional().default(''),
  reference2: z.string().max(80).optional().default(''),
  reference3: z.string().max(80).optional().default(''),
  vat: z.number().min(0).optional().default(0),
  serviceCode: z.string().max(10).optional().default(''),
  indicator4per1000: z.number().int().min(0).max(1).optional().default(0),
  ticketId: z.union([z.string(), z.number()]).optional(),
  recaptchaToken: z.string().optional()
}).refine(
  (data) => {
    if (data.userType === 'person' && data.identificationType === 'NIT') return false;
    return true;
  },
  { message: 'Si el tipo de persona es "person", el tipo de identificacion no puede ser NIT' }
).refine(
  (data) => {
    if (data.userType === 'company' && data.identificationType !== 'NIT') return false;
    return true;
  },
  { message: 'Si el tipo de persona es "company", el unico tipo de identificacion valido es NIT' }
).refine(
  (data) => {
    const forbidden = /[|"]/;
    return !forbidden.test(data.description);
  },
  { message: 'La descripcion no puede contener los caracteres | ni "' }
);

export const finalizeTransactionSchema = z.object({
  trazabilityCode: z.string().min(1, 'Codigo de trazabilidad requerido'),
  authorizationId: z.string().optional()
});

export const trazabilityCodeParamSchema = z.object({
  trazabilityCode: z.string().min(1, 'Codigo de trazabilidad requerido')
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type FinalizeTransactionInput = z.infer<typeof finalizeTransactionSchema>;
