import { Request, Response, NextFunction } from 'express';
import recaptchaService from '../services/recaptcha.service';
import { RECAPTCHA_ACTIONS } from '../config/constants';
import { VALIDATION_ERRORS } from '../utils/errorMessages';

export const verifyRecaptcha = (action: string = RECAPTCHA_ACTIONS.PAYMENT) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token: string | undefined = req.body.recaptchaToken || req.headers['x-recaptcha-token'] as string;

      const result = await recaptchaService.verify(token, req.ip || 'unknown', action);

      if (!result.success) {
        res.status(400).json({
          success: false,
          code: 'FAIL_RECAPTCHA',
          message: VALIDATION_ERRORS.FAIL_RECAPTCHA
        });
        return;
      }

      (req as any).recaptchaScore = result.score;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        code: 'FAIL_RECAPTCHA',
        message: VALIDATION_ERRORS.FAIL_RECAPTCHA
      });
    }
  };
};
