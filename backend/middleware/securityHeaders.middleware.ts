import { Request, Response, NextFunction } from 'express';

/**
 * Devuelve la lista de origenes permitidos.
 * Prioridad:
 *   1. Variable de entorno ALLOWED_ORIGIN (lista separada por comas).
 *   2. Fallback segun entorno (produccion vs desarrollo).
 *
 * CORRECCION: antes las listas de origenes estaban hardcodeadas tanto en
 * el CORS (server.ts) como en validateOrigin, y la variable ALLOWED_ORIGIN
 * del .env no se usaba en ninguna parte. Ahora ambos leen de aqui.
 */
export function getAllowedOrigins(): string[] {
  const fromEnv: string[] = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) {
    return fromEnv;
  }

  return process.env.NODE_ENV === 'production'
    ? ['https://www.juntaatlantico.co', 'https://juntaatlantico.co']
    : ['http://localhost:5173', 'http://localhost:3000'];
}

export const securityHeaders = (
  _req: Request,
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
  // En desarrollo no se valida el Origin (facilita pruebas locales / curl).
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const origin: string | undefined = req.headers.origin || (req.headers.referer as string | undefined);
  const allowedOrigins: string[] = getAllowedOrigins();

  // Endurecimiento opcional (Seccion 11 ACH): si STRICT_ORIGIN=true, se
  // rechazan tambien las peticiones SIN cabecera Origin/Referer. Por defecto
  // esta desactivado para no romper health-checks o monitoreo server-to-server.
  if (!origin) {
    if (process.env.STRICT_ORIGIN === 'true') {
      res.status(403).json({ success: false, message: 'Origen no autorizado' });
      return;
    }
    next();
    return;
  }

  if (!allowedOrigins.some((o) => origin.startsWith(o))) {
    res.status(403).json({
      success: false,
      message: 'Origen no autorizado'
    });
    return;
  }

  next();
};