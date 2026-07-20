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
  amount: z.number().positive('El monto debe ser mayor a 0')
    .refine((n) => /^\d+(\.\d{1,2})?$/.test(n.toString()), 'El monto no puede tener mas de 2 decimales'),
  userType: UserTypeEnum,
  identificationType: IdentificationTypeEnum,
  identificationNumber: z.string().min(1, 'Numero de identificacion requerido'),
  fullName: z.string().min(1, 'Nombre completo requerido').max(200),
  cellphoneNumber: z.string().regex(/^\d{10}$/, 'El celular debe tener 10 digitos'),
  email: z.string().email('Email invalido'),
  address: z.string().min(1, 'Direccion requerida').max(200),
  description: z.string().min(1, 'Descripcion requerida').max(80),
  // Datos del paciente (Requisito PSE #13)
  // reference1 = identificacion del paciente (obligatorio)
  // reference2 = nombre del paciente (obligatorio)
  // reference3 = trazabilidad interna (opcional, backend usa ticketId como fallback)
  reference1: z.string()
    .min(1, 'La identificacion del paciente es requerida')
    .max(80, 'Maximo 80 caracteres')
    .refine(v => !/[|"]/.test(v), 'No puede contener los caracteres | ni "'),
  reference2: z.string()
    .min(1, 'El nombre del paciente es requerido')
    .max(80, 'Maximo 80 caracteres')
    .refine(v => !/[|"]/.test(v), 'No puede contener los caracteres | ni "'),
  reference3: z.string().max(80).optional().default(''),
  vat: z.number().min(0)
    .refine((n) => /^\d+(\.\d{1,2})?$/.test(n.toString()), 'El IVA no puede tener mas de 2 decimales')
    .optional().default(0),
  serviceCode: z.string().max(10).optional().default(''),
  indicator4per1000: z.number().int().min(0).max(1).optional().default(0),
  ticketId: z.union([z.string(), z.number()]).optional(),
  recaptchaToken: z.string().optional()
}).refine(
  (data) => {
    if (data.userType === 'person' && data.identificationType === 'NIT') return false;
    return true;
  },
  { message: 'Si el tipo de persona es "person", el tipo de identificacion no puede ser NIT', path: ['identificationType'] }
).refine(
  (data) => {
    if (data.userType === 'company' && data.identificationType !== 'NIT') return false;
    return true;
  },
  { message: 'Si el tipo de persona es "company", el unico tipo de identificacion valido es NIT', path: ['identificationType'] }
).refine(
  (data) => {
    const forbidden = /[|"]/;
    return !forbidden.test(data.description);
  },
  { message: 'La descripcion no puede contener los caracteres | ni "', path: ['description'] }
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