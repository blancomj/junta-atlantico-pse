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

// Rate limiter para login: 5 intentos por minuto por IP
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'FAIL_RATE_LIMIT',
    message: 'Demasiados intentos de inicio de sesion. Por favor intente en un minuto.'
  },
  keyGenerator: (req: Request): string => req.ip || 'unknown'
});

// Rate limiter para forgot-password: 3 solicitudes por minuto por IP
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'FAIL_RATE_LIMIT',
    message: 'Demasiadas solicitudes de recuperacion de contrasena. Por favor intente en un minuto.'
  },
  keyGenerator: (req: Request): string => req.ip || 'unknown'
});

// Rate limiter general para rutas de auth: 10 solicitudes por minuto por IP
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'FAIL_RATE_LIMIT',
    message: 'Demasiadas solicitudes. Por favor intente en un minuto.'
  },
  keyGenerator: (req: Request): string => req.ip || 'unknown'
});
