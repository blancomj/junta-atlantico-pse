import { Request, Response } from 'express';
import batchPaymentService from '../services/batch-payment.service';
import logger from '../../../../utils/logger';
import { AuthUser } from '../../auth/types/auth.types';

class BatchPaymentController {
  async upload(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No se recibio ningun archivo' });
        return;
      }

      const user = req.user as AuthUser;
      const result = await batchPaymentService.uploadExcel(
        req.file.buffer,
        req.file.originalname,
        user.id,
        user.entityId
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error.type === 'VALIDATION') {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        logger.error('Error uploading Excel:', (error as Error).message);
        res.status(500).json({ success: false, message: 'Error al procesar el archivo' });
      }
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.body;
      if (!fileId) {
        res.status(400).json({ success: false, message: 'fileId requerido' });
        return;
      }

      const user = req.user as AuthUser;
      const payment = await batchPaymentService.createPayment(fileId, user.id, user.entityId);

      res.json({ success: true, data: payment });
    } catch (error) {
      logger.error('Error creating batch payment:', (error as Error).message);
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const { page, pageSize, estado, userId, fechaDesde, fechaHasta } = req.query;

      const result = await batchPaymentService.list(
        user.id,
        user.entityId,
        user.role,
        {
          page: page ? parseInt(page as string) : 1,
          pageSize: pageSize ? parseInt(pageSize as string) : 20,
          estado: estado as string,
          userId: userId as string,
          fechaDesde: fechaDesde as string,
          fechaHasta: fechaHasta as string
        }
      );

      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Error listing batch payments:', (error as Error).message);
      res.status(500).json({ success: false, message: 'Error al obtener la lista' });
    }
  }

  async detail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payment = await batchPaymentService.findById(id);
      const beneficiaries = await batchPaymentService.findBeneficiaries(id);
      const attempts = await batchPaymentService.getAttempts(id);

      res.json({ success: true, data: { ...payment, beneficiaries, attempts } });
    } catch (error) {
      logger.error('Error getting batch payment detail:', (error as Error).message);
      res.status(404).json({ success: false, message: (error as Error).message });
    }
  }

  async annul(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      if (!motivo || motivo.trim().length === 0) {
        res.status(400).json({ success: false, message: 'El motivo de anulacion es requerido' });
        return;
      }

      const user = req.user as AuthUser;
      const payment = await batchPaymentService.annul(id, user.id, motivo);

      res.json({ success: true, data: payment, message: 'Proceso anulado correctamente' });
    } catch (error) {
      logger.error('Error annulling batch payment:', (error as Error).message);
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }

  async pay(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { bankCode } = req.body;

      if (!bankCode) {
        res.status(400).json({ success: false, message: 'Codigo de banco requerido' });
        return;
      }

      const user = req.user as AuthUser;
      const payment = await batchPaymentService.findById(id);

      if (payment.user_id !== user.id) {
        res.status(403).json({ success: false, message: 'No tienes permiso para pagar este proceso' });
        return;
      }

      if (payment.estado !== 'por_pagar') {
        res.status(400).json({ success: false, message: 'Solo se pueden pagar procesos en estado "por pagar"' });
        return;
      }

      // TODO: Call PSE service to create transaction
      // For now, return a mock response
      const mockCus = 'CUS_' + Date.now().toString().slice(-6);
      const mockPseUrl = `https://apicer.pse.com.co/mock-payment?cus=${mockCus}&bank=${bankCode}`;

      await batchPaymentService.markAsPaid(id, mockCus, mockPseUrl);
      await batchPaymentService.recordAttempt(id, mockCus, 'exitoso', 'Transaccion creada', bankCode);

      res.json({
        success: true,
        data: {
          trazabilityCode: mockCus,
          pseURL: mockPseUrl
        }
      });
    } catch (error) {
      logger.error('Error paying batch payment:', (error as Error).message);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async pseCallback(req: Request, res: Response): Promise<void> {
    try {
      const { trazabilityCode, status, authorizationId } = req.body;

      // TODO: Verify PSE callback signature
      // For now, process directly
      logger.info(`PSE callback received: ${trazabilityCode} - ${status}`);

      res.json({ success: true });
    } catch (error) {
      logger.error('Error processing PSE callback:', (error as Error).message);
      res.status(500).json({ success: false, message: 'Error al procesar callback' });
    }
  }

  async searchBeneficiary(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      if (!q || (q as string).trim().length < 2) {
        res.status(400).json({ success: false, message: 'Minimo 2 caracteres para buscar' });
        return;
      }

      const user = req.user as AuthUser;
      const results = await batchPaymentService.searchBeneficiary((q as string).trim(), user.role, user.id);

      res.json({ success: true, data: results });
    } catch (error) {
      logger.error('Error searching beneficiary:', (error as Error).message);
      res.status(500).json({ success: false, message: 'Error al buscar beneficiario' });
    }
  }
}

export default new BatchPaymentController();