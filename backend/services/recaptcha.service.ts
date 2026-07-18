import axios from 'axios';
import config from '../config/pse.config';
import logger from '../utils/logger';
import { RecaptchaVerificationResult } from '../../shared/types/pse-api';

class RecaptchaService {
  async verify(
    token: string | undefined,
    remoteIp: string,
    expectedAction: string = 'pse_payment'
  ): Promise<RecaptchaVerificationResult> {
    if (!config.recaptcha.secret) {
      if (config.env === 'dev') {
        logger.warn('RECAPTCHA_SECRET no configurado — bypass en dev');
        return { success: true, score: 1.0 };
      }
      return { success: false, score: 0, error: 'RECAPTCHA_SECRET no configurado' };
    }

    if (!token) {
      return { success: false, score: 0, error: 'Token de reCAPTCHA faltante' };
    }

    try {
      const { data } = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: config.recaptcha.secret,
            response: token,
            remoteip: remoteIp
          },
          timeout: 5000
        }
      );

      logger.info(`reCAPTCHA: success=${data.success}, score=${data.score}, action=${data.action}`);

      if (!data.success) {
        return { success: false, score: 0, error: 'Verificacion reCAPTCHA fallo' };
      }

      if (data.action !== expectedAction) {
        return { success: false, score: data.score, error: `Accion incorrecta: ${data.action}` };
      }

      if (data.score < config.recaptcha.scoreMin) {
        return {
          success: false,
          score: data.score,
          error: `Score ${data.score} < minimo ${config.recaptcha.scoreMin}`
        };
      }

      return { success: true, score: data.score };
    } catch (error) {
      logger.error('Error verificando reCAPTCHA:', (error as Error).message);
      return { success: false, score: 0, error: 'Error al verificar reCAPTCHA' };
    }
  }
}

export default new RecaptchaService();
