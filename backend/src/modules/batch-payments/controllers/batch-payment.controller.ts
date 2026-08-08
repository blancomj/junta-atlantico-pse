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
      const payment = await batchPaymentService.createPayment(fileId, user.id, user.entityId, user.direccion, user.telefono);

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
      const user = req.user as AuthUser;
      const payment = await batchPaymentService.findById(id);

      // Verificar propiedad: solo el dueño o un admin pueden ver el detalle
      if (payment.user_id !== user.id && user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'No tienes permiso para ver este proceso' });
        return;
      }

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
      const { trazabilityCode, status, authorizationId, bankName } = req.body;

      if (!trazabilityCode || !status) {
        res.status(400).json({ success: false, message: 'trazabilityCode y status son requeridos' });
        return;
      }

      logger.info(`PSE Callback recibido: ${trazabilityCode} — estado: ${status}`);

      // Normalizar el estado según los códigos estándar de PSE Avanza
      const normalizedStatus = String(status).toUpperCase();

      if (normalizedStatus === 'APROBADA' || normalizedStatus === 'APPROVED') {
        // Pago aprobado: marcar como pagado
        await batchPaymentService.completePayment(
          trazabilityCode,
          bankName || '',
          authorizationId || trazabilityCode
        );
        await batchPaymentService.recordAttempt(
          trazabilityCode, trazabilityCode, 'exitoso',
          `Pago aprobado por PSE. AuthId: ${authorizationId || 'N/A'}`,
          bankName
        );
        logger.info(`Pago aprobado por callback PSE: ${trazabilityCode}`);

      } else if (
        normalizedStatus === 'RECHAZADA' || normalizedStatus === 'REJECTED' ||
        normalizedStatus === 'FALLIDA'   || normalizedStatus === 'FAILED'
      ) {
        // Pago rechazado: registrar intento fallido
        await batchPaymentService.recordAttempt(
          trazabilityCode, trazabilityCode, 'fallido',
          `Pago rechazado por PSE. Estado: ${status}`,
          bankName
        );
        logger.warn(`Pago rechazado por callback PSE: ${trazabilityCode} — ${status}`);

      } else {
        // Estado desconocido o pendiente: solo registrar para auditoría
        logger.info(`PSE Callback con estado no definitivo: ${trazabilityCode} — ${status}`);
      }

      // PSE espera siempre 200 OK para confirmar recepción del callback
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error procesando PSE callback:', (error as Error).message);
      // Retornar 200 de todas formas para evitar reintentos infinitos de PSE
      res.status(200).json({ success: false, message: 'Error interno al procesar callback' });
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