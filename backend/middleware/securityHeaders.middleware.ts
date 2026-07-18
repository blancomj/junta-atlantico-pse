import { Request, Response, NextFunction } from 'express';
import config from '../config/pse.config';

export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

export const validateOrigin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const origin: string | undefined = req.headers.origin || req.headers.referer;
  const allowedOrigins: string[] = [
    'https://www.juntaatlantico.co',
    'https://juntaatlantico.co'
  ];

  if (origin && !allowedOrigins.some(o => origin.startsWith(o))) {
    res.status(403).json({
      success: false,
      message: 'Origen no autorizado'
    });
    return;
  }

  next();
};
