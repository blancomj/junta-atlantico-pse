import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config/pse.config';

export const pseTransactionLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'FAIL_RATE_LIMIT',
    message: 'Demasiadas solicitudes. Por favor intente en un minuto.'
  },
  keyGenerator: (req: Request): string => req.ip || 'unknown'
});

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Por favor intente en un minuto.'
  }
});
