import { UserType, IdentificationType, PaymentData } from '../../shared/types/payment';
import { USER_TYPES, VALID_ID_TYPES, FORBIDDEN_CHARS_REGEX } from '../config/constants';

export class PaymentValidator {
  static validateUserTypeCombination(userType: UserType, identificationType: IdentificationType): void {
    if (!USER_TYPES.includes(userType)) {
      throw new Error('Tipo de persona invalido. Debe ser "person" o "company"');
    }
    if (!VALID_ID_TYPES.includes(identificationType)) {
      throw new Error(`Tipo de identificacion invalido: ${identificationType}`);
    }

    if (userType === 'person' && identificationType === 'NIT') {
      throw new Error('Si el tipo de persona es "person", el tipo de identificacion no puede ser NIT');
    }

    if (userType === 'company' && identificationType !== 'NIT') {
      throw new Error('Si el tipo de persona es "company", el unico tipo de identificacion valido es NIT');
    }
  }

  static validateNoForbiddenChars(field: string, value: string): void {
    if (typeof value === 'string' && FORBIDDEN_CHARS_REGEX.test(value)) {
      throw new Error(`El campo "${field}" no puede contener los caracteres "|" ni '"'`);
    }
  }

  static validatePaymentData(data: PaymentData): void {
    const required: (keyof PaymentData)[] = [
      'bankCode', 'amount', 'userType',
      'identificationType', 'identificationNumber',
      'fullName', 'cellphoneNumber', 'email', 'address',
      'description'
    ];

    for (const field of required) {
      if (!data[field] && data[field] !== 0) {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }

    this.validateUserTypeCombination(data.userType, data.identificationType);

    (['description', 'reference1', 'reference2', 'reference3'] as const).forEach(field => {
      const value = data[field];
      if (typeof value === 'string') {
        this.validateNoForbiddenChars(field, value);
      }
    });

    if (data.amount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    if (!/^\d{10}$/.test(String(data.cellphoneNumber).replace(/\D/g, ''))) {
      throw new Error('El numero de celular debe tener 10 digitos');
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Email invalido');
    }

    if (data.description && data.description.length > 80) {
      throw new Error('La descripcion no puede tener mas de 80 caracteres');
    }
  }
}
