import { Request, Response, NextFunction } from 'express';

const FORBIDDEN_CHARS_REGEX = /[|"]/;
const HTML_ESCAPE_REGEX = /[<>&"']/g;

function sanitizeString(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v =>
        typeof v === 'string' ? sanitizeString(v) :
        typeof v === 'object' && v !== null ? sanitizeObject(v) : v
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query as Record<string, any>);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

export const checkForbiddenChars = (req: Request, res: Response, next: NextFunction): void => {
  const fieldsToCheck = ['description', 'reference1', 'reference2', 'reference3', 'paymentDescription'];

  for (const field of fieldsToCheck) {
    const value = req.body?.[field];
    if (typeof value === 'string' && FORBIDDEN_CHARS_REGEX.test(value)) {
      res.status(400).json({
        success: false,
        code: 'FAIL_VALIDATION',
        message: `El campo "${field}" no puede contener los caracteres "|" ni '"'`
      });
      return;
    }
  }
  next();
};
