import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError } from '../errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.error(`[${err.code}] ${err.message}`, {
      requestId: req.requestId,
      path: req.path,
      statusCode: err.statusCode
    });

    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err as any).errors && { errors: (err as any).errors }
    });
    return;
  }

  if ((err as any).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      code: 'INVALID_JSON',
      message: 'JSON invalido en el cuerpo de la peticion'
    });
    return;
  }

  logger.error('Error no manejado:', {
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path
  });

  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Error interno del servidor'
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Endpoint no encontrado: ${req.method} ${req.path}`
  });
};
