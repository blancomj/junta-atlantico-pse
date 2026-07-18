import * as errorMessages from '../utils/errorMessages';
import { TRANSACTION_STATES } from '../config/constants';

describe('ErrorMessages', () => {
  describe('getPSEErrorMessage', () => {
    test('should return literal message for FAIL_EXCEEDEDLIMIT', () => {
      const msg = errorMessages.getPSEErrorMessage('FAIL_EXCEEDEDLIMIT');
      expect(msg).toContain('excede los limites');
      expect(msg).toContain('facturacion@juntaatlantico.co');
    });

    test('should return literal message for FAIL_BANKUNREACHEABLE', () => {
      const msg = errorMessages.getPSEErrorMessage('FAIL_BANKUNREACHEABLE');
      expect(msg).toContain('entidad financiera');
      expect(msg).toContain('seleccione otra');
    });

    test('should return literal message for FAIL_DISABLEDUSEREMAIL', () => {
      const msg = errorMessages.getPSEErrorMessage('FAIL_DISABLEDUSEREMAIL');
      expect(msg).toContain('restricciones');
    });

    test('should return generic message for unknown code', () => {
      const msg = errorMessages.getPSEErrorMessage('UNKNOWN_CODE');
      expect(msg).toContain('comuniquese con la empresa');
    });
  });

  describe('getDoublePaymentMessage', () => {
    test('should return APROBADO message for OK state', () => {
      const msg = errorMessages.getDoublePaymentMessage(
        TRANSACTION_STATES.OK, '12345', 'CUS_123'
      );
      expect(msg).toContain('APROBADA');
      expect(msg).toContain('#12345');
      expect(msg).toContain('CUS_123');
    });

    test('should return PENDIENTE message for PENDING state', () => {
      const msg = errorMessages.getDoublePaymentMessage(
        TRANSACTION_STATES.PENDING, '12345', 'CUS_456'
      );
      expect(msg).toContain('PENDIENTE');
      expect(msg).toContain('#12345');
      expect(msg).toContain('CUS_456');
    });
  });
});
