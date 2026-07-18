import { Router, Request, Response } from 'express';
import pseController from '../controllers/pse.controller';
import { verifyRecaptcha } from '../middleware/recaptcha.middleware';
import { pseTransactionLimiter, globalLimiter } from '../middleware/rateLimit.middleware';
import { checkForbiddenChars } from '../middleware/sanitize.middleware';
import { validateBody, validateParams } from '../validation/middleware';
import { createTransactionSchema, finalizeTransactionSchema, trazabilityCodeParamSchema } from '../validation/schemas';
import { RECAPTCHA_ACTIONS } from '../config/constants';
import tokenService from '../services/token.service';
import encryptionService from '../services/encryption.service';
import logger from '../utils/logger';

const router: Router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      pseApi: 'unknown',
      encryption: 'ok',
      token: 'unknown'
    }
  };

  try {
    await tokenService.getToken();
    health.services.token = 'ok';
    health.services.pseApi = 'ok';
  } catch (error) {
    health.services.token = 'error';
    health.services.pseApi = 'error';
    health.status = 'DEGRADED';
    logger.error('Health check: token service error', error);
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/banks', globalLimiter, (req: Request, res: Response) => {
  pseController.getBankList(req, res);
});

router.post('/transaction',
  pseTransactionLimiter,
  verifyRecaptcha(RECAPTCHA_ACTIONS.PAYMENT),
  validateBody(createTransactionSchema),
  checkForbiddenChars,
  (req: Request, res: Response) => {
    pseController.createTransaction(req, res);
  }
);

router.get('/transaction/:trazabilityCode/status',
  validateParams(trazabilityCodeParamSchema),
  (req: Request, res: Response) => {
    pseController.getTransactionStatus(req, res);
  }
);

router.get('/transaction/:trazabilityCode/detailed',
  validateParams(trazabilityCodeParamSchema),
  (req: Request, res: Response) => {
    pseController.getTransactionDetailed(req, res);
  }
);

router.post('/transaction/finalize',
  validateBody(finalizeTransactionSchema),
  (req: Request, res: Response) => {
    pseController.finalizeTransaction(req, res);
  }
);

export default router;
