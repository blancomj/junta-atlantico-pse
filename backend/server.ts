import dotenv from 'dotenv';
import path from 'path';

// Cargar .env.development si NODE_ENV=development, si no .env (mismo criterio que src/database/apply-migrations.ts)
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/pse.config';
import pseRoutes from './routes/pse.routes';
import authRoutes from './src/modules/auth/routes/auth.routes';
import adminRoutes from './src/modules/admin/routes/admin.routes';
import batchPaymentRoutes from './src/modules/batch-payments/routes/batch-payment.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { securityHeaders, validateOrigin, getAllowedOrigins } from './middleware/securityHeaders.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { sanitizeInput } from './middleware/sanitize.middleware';
import { testConnection, closePool } from './src/database/connection';
import { runMigrations } from './src/database/migrator';
import excelParser from './src/modules/batch-payments/services/excel-parser.service';
import pendingIndividualPayment from './services/pendingIndividualPayment.service';
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
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/batch-payments', batchPaymentRoutes);

// 404
app.use(notFoundHandler);

// Error global
app.use(errorHandler);

async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Run migrations
    await runMigrations();

    // Start Excel cache cleanup
    excelParser.startCleanup();
    pendingIndividualPayment.startCleanup();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Servidor PSE ejecutandose en puerto ${PORT}`);
      logger.info(`Entorno: ${config.env}`);
      logger.info(`reCAPTCHA: ${config.recaptcha.secret ? 'activo' : 'INACTIVO'}`);
      logger.info(`Rate Limit: ${config.rateLimit.max} req/${config.rateLimit.windowMs / 1000}s`);
      logger.info(`Base de datos: MySQL conectado`);
    });
  } catch (error) {
    logger.error('Error starting server:', (error as Error).message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  excelParser.stopCleanup();
  pendingIndividualPayment.stopCleanup();
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  excelParser.stopCleanup();
  pendingIndividualPayment.stopCleanup();
  await closePool();
  process.exit(0);
});

startServer();

export default app;