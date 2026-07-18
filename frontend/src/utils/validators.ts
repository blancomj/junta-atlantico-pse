export const FORBIDDEN_CHARS_REGEX: RegExp = /[|"]/;

export function validateNoForbiddenChars(field: string, value: string): string | null {
  if (typeof value === 'string' && FORBIDDEN_CHARS_REGEX.test(value)) {
    return `El campo "${field}" no puede contener los caracteres "|" ni '"'`;
  }
  return null;
}

export function validateUserTypeCombination(userType: string, identificationType: string): string | null {
  if (userType === 'person' && identificationType === 'NIT') {
    return 'Si el tipo de persona es "Persona Natural", el tipo de identificacion no puede ser NIT';
  }
  if (userType === 'company' && identificationType !== 'NIT') {
    return 'Si el tipo de persona es "Empresa", el unico tipo de identificacion valido es NIT';
  }
  return null;
}

interface FormData {
  bankCode: string;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  email: string;
  address: string;
  description: string;
  amount: number | null;
  userType: string;
  identificationType: string;
  reference1?: string;
  reference2?: string;
  reference3?: string;
}

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export function validateForm(data: FormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.bankCode) errors.bankCode = 'Selecciona un banco';
  if (!data.identificationNumber) errors.identificationNumber = 'Requerido';
  if (!data.fullName) errors.fullName = 'Requerido';
  if (!data.cellphoneNumber) errors.cellphoneNumber = 'Requerido';
  if (!data.email) errors.email = 'Requerido';
  if (!data.address) errors.address = 'Requerida';
  if (!data.description) errors.description = 'Requerida';

  if (!data.amount || data.amount <= 0) errors.amount = 'El monto debe ser mayor a 0';

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Email invalido';
  }

  if (data.cellphoneNumber && !/^\d{10}$/.test(data.cellphoneNumber.replace(/\D/g, ''))) {
    errors.cellphoneNumber = 'El celular debe tener 10 digitos';
  }

  const charErrors: (string | null)[] = [
    validateNoForbiddenChars('description', data.description),
    validateNoForbiddenChars('reference1', data.reference1 || ''),
    validateNoForbiddenChars('reference2', data.reference2 || ''),
    validateNoForbiddenChars('reference3', data.reference3 || '')
  ].filter(Boolean);

  if (charErrors.length > 0) {
    errors.forbiddenChars = charErrors[0] || undefined;
  }

  const userTypeError: string | null = validateUserTypeCombination(data.userType, data.identificationType);
  if (userTypeError) errors.userType = userTypeError;

  return errors;
}
