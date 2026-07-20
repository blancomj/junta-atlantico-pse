import dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/pse.config';
import pseRoutes from './routes/pse.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { securityHeaders, validateOrigin, getAllowedOrigins } from './middleware/securityHeaders.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { sanitizeInput } from './middleware/sanitize.middleware';
import logger from './utils/logger';

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);


// Hostinger (y cualquier hosting gestionado) pone un proxy inverso (Nginx)
// delante de Node.js. Sin esta configuracion, Express ignora el header
// X-Forwarded-For y el rate limit identifica a todos los usuarios como
// si fueran la misma IP (la del proxy interno).
// El valor 1 indica "confiar en un nivel de proxy" — el de Hostinger.
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARES DE SEGURIDAD (Seccion 11 ACH)
// ============================================

// Request ID para trazabilidad
app.use(requestIdMiddleware);

// Helmet con configuracion estricta
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      frameSrc: ["https://www.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.google.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' }
}));

// CORS estricto
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Recaptcha-Token']
}));

// Cabeceras de seguridad adicionales
app.use(securityHeaders);

// Validacion de Origin
app.use(validateOrigin);

// Logging con request ID
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));

// Sanitizacion de inputs
app.use(sanitizeInput);

// Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Rutas
app.use('/api/pse', pseRoutes);

// 404
app.use(notFoundHandler);

// Error global
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Servidor PSE ejecutandose en puerto ${PORT}`);
  logger.info(`Entorno: ${config.env}`);
  logger.info(`reCAPTCHA: ${config.recaptcha.secret ? 'activo' : 'INACTIVO'}`);
  logger.info(`Rate Limit: ${config.rateLimit.max} req/${config.rateLimit.windowMs / 1000}s`);
});

export default app;