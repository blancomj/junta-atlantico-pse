import config from '../config/pse.config';
import { TransactionState } from '../../shared/types/transaction';
import { DoublePaymentCheckResult } from '../../shared/types/pse-api';
import logger from '../utils/logger';
import { getDoublePaymentMessage } from '../utils/errorMessages';
import TransactionModel from '../models/transaction.model';

class DoublePaymentService {
  async check(
    ticketId: string | number,
    trazabilityCode: string | null = null
  ): Promise<DoublePaymentCheckResult> {
    if (!config.doublePaymentCheck) {
      return { exists: false };
    }

    try {
      const existing = await TransactionModel.findByTicketId(ticketId, trazabilityCode);

      if (!existing) {
        return { exists: false };
      }

      if (existing.transaction_state === 'OK') {
        return {
          exists: true,
          state: 'OK' as TransactionState,
          trazabilityCode: existing.trazability_code
        };
      }

      if (existing.transaction_state === 'PENDING') {
        return {
          exists: true,
          state: 'PENDING' as TransactionState,
          trazabilityCode: existing.trazability_code
        };
      }

      return { exists: false };
    } catch (error) {
      logger.error('Error en control doble pago:', error);
      return { exists: false };
    }
  }

  getErrorMessage(check: DoublePaymentCheckResult, ticketId: string | number): string {
    return getDoublePaymentMessage(check.state || '', ticketId, check.trazabilityCode || '');
  }
}

export default new DoublePaymentService();
