import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { AuthUser } from '../types/auth.types';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token de autenticacion requerido'
    });
    return;
  }

  const token = authHeader.substring(7);
  try {
    req.user = await authService.verifyAccessToken(token);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: (error as Error).message || 'Token invalido'
    });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta accion'
      });
      return;
    }
    next();
  };
};
