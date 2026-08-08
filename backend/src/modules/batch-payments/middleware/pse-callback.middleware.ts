import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../../../../utils/logger';

/**
 * Verifica la autenticidad del callback recibido desde PSE (ACH Colombia).
 *
 * PSE debe enviar el header `X-PSE-Signature` con el HMAC-SHA256 del body
 * calculado usando el secreto compartido PSE_CALLBACK_SECRET.
 *
 * Si PSE_CALLBACK_SECRET no esta configurado:
 *   - En produccion: rechaza el request (fail-secure).
 *   - En desarrollo: advierte y continua (para facilitar pruebas locales).
 *
 * Despues de la verificacion exitosa, el body crudo se parsea a JSON
 * y se asigna a req.body para que el controlador lo pueda leer normalmente.
 */
export const verifyPseCallbackSignature = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const callbackSecret = process.env.PSE_CALLBACK_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // -- 1. Verificar que el secreto este configurado --------------------------
  if (!callbackSecret) {
    if (isProduction) {
      logger.error('PSE Callback rechazado: PSE_CALLBACK_SECRET no esta configurado en produccion.');
      res.status(500).json({ success: false, message: 'Configuracion de seguridad incompleta' });
      return;
    }
    // En desarrollo: permitir sin firma (solo con advertencia)
    logger.warn('[DEV] PSE_CALLBACK_SECRET no configurado — verificacion de firma omitida en desarrollo.');
    parseRawBody(req);
    next();
    return;
  }

  // -- 2. Obtener la firma enviada por PSE ------------------------------------
  const receivedSignature = req.headers['x-pse-signature'] as string | undefined;
  if (!receivedSignature) {
    logger.warn('PSE Callback rechazado: header X-PSE-Signature ausente.', {
      ip: req.ip,
      path: req.path
    });
    res.status(401).json({ success: false, message: 'Firma de callback requerida' });
    return;
  }

  // -- 3. Calcular la firma esperada sobre el body crudo ---------------------
  // req.body aqui es un Buffer porque usamos express.raw() en la ruta.
  const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

  const expectedSignature = crypto
    .createHmac('sha256', callbackSecret)
    .update(rawBody)
    .digest('hex');

  // -- 4. Comparar con timingSafeEqual para evitar timing attacks ------------
  let signaturesMatch = false;
  try {
    signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    // Buffer.from() puede lanzar si la firma recibida no es hex valido
    signaturesMatch = false;
  }

  if (!signaturesMatch) {
    logger.warn('PSE Callback rechazado: firma invalida.', {
      ip: req.ip,
      receivedSignature: receivedSignature.slice(0, 8) + '...'
    });
    res.status(401).json({ success: false, message: 'Firma de callback invalida' });
    return;
  }

  // -- 5. Firma valida: parsear body JSON para el controlador ----------------
  logger.info('PSE Callback: firma verificada correctamente.', { ip: req.ip });
  parseRawBody(req);
  next();
};

/**
 * Intenta parsear el body crudo (Buffer) como JSON y lo asigna a req.body.
 * Si no es JSON valido, deja req.body como objeto vacio.
 */
function parseRawBody(req: Request): void {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '{}';
    req.body = JSON.parse(rawBody);
  } catch {
    req.body = {};
  }
}
