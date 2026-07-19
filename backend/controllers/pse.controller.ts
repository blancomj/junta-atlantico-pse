import { Request, Response } from 'express';
import pseService from '../services/pse.service';
import bankListService from '../services/bankList.service';
import { FINAL_STATES } from '../config/constants';
import doublePaymentService from '../services/doublePayment.service';
import { getPSEErrorMessage } from '../utils/errorMessages';
import logger from '../utils/logger';
import { CreateTransactionInput } from '../validation/schemas';
import { PSEApiResponse } from '../../shared/types/pse-api';


class PSEController {
  async getBankList(req: Request, res: Response): Promise<void> {
    try {
      // Requisito PSE #4: la lista se sirve desde caché diaria (GetBankListNF
      // se llama a lo sumo una vez al día, no por transacción).
      // Requisito PSE #8: ordenada alfabéticamente.
      const { banks, source, cached } = await bankListService.getBanks();
      res.json({
        success: true,
        data: banks,
        message: 'Lista de bancos obtenida exitosamente',
        meta: { source, cached }
      });
    } catch (error) {
      logger.error('Error en getBankList:', (error as Error).message);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Error al obtener lista de bancos'
      });
    }
  }

  async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const paymentData: CreateTransactionInput = req.body;

      const doublePaymentCheck = await doublePaymentService.check(
        paymentData.ticketId || Date.now() + Math.floor(Math.random() * 1000)
      );

      if (doublePaymentCheck.exists) {
        const message: string = doublePaymentService.getErrorMessage(
          doublePaymentCheck,
          paymentData.ticketId || 'unknown'
        );
        res.status(409).json({
          success: false,
          code: 'FAIL_DOUBLEPAYMENT',
          message
        });
        return;
      }

      let result: PSEApiResponse;
      try {
        result = await pseService.createTransaction(paymentData);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('PSE API no disponible, usando respuesta mock');
          const mockCus = 'CUS_' + Date.now().toString().slice(-6);
          const mockTicketId = paymentData.ticketId || Date.now();
          result = {
            returnCode: 'SUCCESS',
            trazabilityCode: mockCus,
            pseURL: `https://apicer.pse.com.co/mock-payment?cus=${mockCus}&bank=${paymentData.bankCode}`,
            transactionCycle: 1
          } as unknown as PSEApiResponse;
        } else {
          throw error;
        }
      }

      if (result.returnCode === 'SUCCESS') {
        logger.info(`Transaccion creada: CUS=${result.trazabilityCode}, score=${(req as any).recaptchaScore}`);
        res.json({
          success: true,
          data: {
            trazabilityCode: result.trazabilityCode,
            pseURL: result.pseURL,
            ticketId: paymentData.ticketId || Date.now(),
            transactionCycle: result.transactionCycle
          },
          message: 'Transaccion creada exitosamente'
        });
        return;
      }

      res.status(400).json({
        success: false,
        code: result.returnCode,
        message: getPSEErrorMessage(result.returnCode),
        details: result.errorDetails || null
      });

    } catch (error) {
      logger.error('Error en createTransaction:', (error as Error).message);

      const errMsg: string = (error as Error).message;
      if (errMsg.includes('requerido') ||
          errMsg.includes('prohibidos') ||
          errMsg.includes('serviceCode')) {
        res.status(400).json({
          success: false,
          code: 'FAIL_VALIDATION',
          message: errMsg
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: errMsg || 'Error al crear la transaccion'
      });
    }
  }

  async getTransactionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { trazabilityCode } = req.params;

      let result: PSEApiResponse;
      try {
        result = await pseService.getTransactionInformation(trazabilityCode);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('PSE API no disponible, usando estado mock');
          result = {
            returnCode: 'SUCCESS',
            transactionState: 'OK',
            trazabilityCode,
            bankProcessingDate: new Date().toISOString(),
            authorizationID: 'AUTH_' + Date.now()
          } as unknown as PSEApiResponse;
        } else {
          throw error;
        }
      }

      if (result.transactionState && FINAL_STATES.includes(result.transactionState as any)) {
        try {
          if (result.transactionState === 'OK') {
            await pseService.finalizeTransaction(trazabilityCode, result.authorizationID || null);
          }
        } catch (finalizeError) {
          logger.warn('Error al finalizar transaccion:', (finalizeError as Error).message);
        }
      }

      res.json({
        success: true,
        data: result,
        message: 'Estado de transaccion consultado exitosamente'
      });
    } catch (error) {
      logger.error('Error en getTransactionStatus:', (error as Error).message);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Error al consultar el estado de la transaccion'
      });
    }
  }

  async getTransactionDetailed(req: Request, res: Response): Promise<void> {
    try {
      const { trazabilityCode } = req.params;

      let result: PSEApiResponse;
      try {
        result = await pseService.getTransactionInformationDetailed(trazabilityCode);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('PSE API no disponible, usando detalle mock');
          result = {
            returnCode: 'SUCCESS',
            transactionState: 'OK',
            trazabilityCode,
            bankProcessingDate: new Date().toISOString(),
            authorizationID: 'AUTH_' + Date.now(),
            transactionValue: 10000,
            vatValue: 0
          } as unknown as PSEApiResponse;
        } else {
          throw error;
        }
      }

      res.json({
        success: true,
        data: result,
        message: 'Informacion detallada obtenida exitosamente'
      });
    } catch (error) {
      logger.error('Error en getTransactionDetailed:', (error as Error).message);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Error al obtener informacion detallada'
      });
    }
  }

  async finalizeTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { trazabilityCode, authorizationId } = req.body;

      const result: PSEApiResponse = await pseService.finalizeTransaction(trazabilityCode, authorizationId);

      res.json({
        success: true,
        data: result,
        message: 'Transaccion finalizada exitosamente'
      });
    } catch (error) {
      logger.error('Error en finalizeTransaction:', (error as Error).message);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Error al finalizar la transaccion'
      });
    }
  }
}

export default new PSEController();