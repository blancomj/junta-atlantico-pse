import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../utils/logger';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages: string[] = error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`);
        logger.warn('Validacion fallida:', { errors: messages, path: req.path });
        res.status(400).json({
          success: false,
          code: 'FAIL_VALIDATION',
          message: 'Datos de entrada invalidos',
          errors: messages
        });
        return;
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages: string[] = error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`);
        res.status(400).json({
          success: false,
          message: 'Parametros invalidos',
          errors: messages
        });
        return;
      }
      next(error);
    }
  };
};
