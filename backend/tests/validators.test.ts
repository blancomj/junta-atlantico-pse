import { PaymentValidator } from '../utils/validators';
import { PaymentData } from '../../shared/types/payment';

describe('PaymentValidator', () => {
  describe('validateUserTypeCombination', () => {
    test('should accept person + CedulaDeCiudadania', () => {
      expect(() => {
        PaymentValidator.validateUserTypeCombination('person', 'CedulaDeCiudadania');
      }).not.toThrow();
    });

    test('should accept person + CedulaDeExtranjeria', () => {
      expect(() => {
        PaymentValidator.validateUserTypeCombination('person', 'CedulaDeExtranjeria');
      }).not.toThrow();
    });

    test('should accept person + Pasaporte', () => {
      expect(() => {
        PaymentValidator.validateUserTypeCombination('person', 'Pasaporte');
      }).not.toThrow();
    });

    test('should accept company + NIT', () => {
      expect(() => {
        PaymentValidator.validateUserTypeCombination('company', 'NIT');
      }).not.toThrow();
    });

    test('should reject person + NIT', () => {
      expect(() => {
        PaymentValidator.validateUserTypeCombination('person', 'NIT');
      }).toThrow('person');
    });

    test('should reject company + CedulaDeCiudadania', () => {
      expect(() => {
        PaymentValidator.validateUserTypeCombination('company', 'CedulaDeCiudadania');
      }).toThrow('company');
    });

    test('should reject invalid userType', () => {
      expect(() => {
        PaymentValidator.validateUserTypeCombination('invalid' as any, 'NIT');
      }).toThrow();
    });
  });

  describe('validateNoForbiddenChars', () => {
    test('should accept text without forbidden chars', () => {
      expect(() => {
        PaymentValidator.validateNoForbiddenChars('description', 'Pago normal');
      }).not.toThrow();
    });

    test('should reject text with pipe character', () => {
      expect(() => {
        PaymentValidator.validateNoForbiddenChars('description', 'Pago|test');
      }).toThrow();
    });

    test('should reject text with double quote', () => {
      expect(() => {
        PaymentValidator.validateNoForbiddenChars('description', 'Pago"test');
      }).toThrow();
    });
  });

  describe('validatePaymentData', () => {
    const validData: PaymentData = {
      bankCode: '1007',
      amount: 150000,
      userType: 'person',
      identificationType: 'CedulaDeCiudadania',
      identificationNumber: '1234567890',
      fullName: 'Juan Perez',
      cellphoneNumber: '3001234567',
      email: 'juan@test.com',
      address: 'Calle 123',
      description: 'Pago de prueba'
    };

    test('should accept valid payment data', () => {
      expect(() => {
        PaymentValidator.validatePaymentData(validData);
      }).not.toThrow();
    });

    test('should reject missing required fields', () => {
      expect(() => {
        PaymentValidator.validatePaymentData({ ...validData, bankCode: '' });
      }).toThrow('requerido');
    });

    test('should reject amount <= 0', () => {
      expect(() => {
        PaymentValidator.validatePaymentData({ ...validData, amount: 0 });
      }).toThrow('mayor a 0');
    });

    test('should reject invalid phone number', () => {
      expect(() => {
        PaymentValidator.validatePaymentData({ ...validData, cellphoneNumber: '123' });
      }).toThrow('10 digitos');
    });

    test('should reject invalid email', () => {
      expect(() => {
        PaymentValidator.validatePaymentData({ ...validData, email: 'invalid' });
      }).toThrow('Email');
    });

    test('should reject description > 80 chars', () => {
      expect(() => {
        PaymentValidator.validatePaymentData({
          ...validData,
          description: 'a'.repeat(81)
        });
      }).toThrow('80 caracteres');
    });

    test('should reject forbidden chars in description', () => {
      expect(() => {
        PaymentValidator.validatePaymentData({
          ...validData,
          description: 'Pago|test'
        });
      }).toThrow();
    });
  });
});
