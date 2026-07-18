import { PSEConfig } from '../../shared/types/config';

const config: PSEConfig = {
  env: process.env.PSE_ENV || 'cert',

  apiKey: process.env.PSE_API_KEY || '',
  clientId: process.env.PSE_CLIENT_ID || '',
  clientSecret: process.env.PSE_CLIENT_SECRET || '',

  encryptionKey: process.env.PSE_ENCRYPTION_KEY || '',
  encryptionIv: process.env.PSE_ENCRYPTION_IV || '',

  entityCode: process.env.PSE_ENTITY_CODE || '',
  serviceCode: process.env.PSE_SERVICE_CODE || '',
  ciiuCategory: process.env.PSE_CIIU_CATEGORY || '',
  companyName: process.env.PSE_COMPANY_NAME || '',

  tokenUrl: process.env.PSE_TOKEN_URL || '',
  apiBaseUrl: process.env.PSE_API_BASE_URL || '',
  returnUrl: process.env.PSE_RETURN_URL || '',

  recaptcha: {
    secret: process.env.RECAPTCHA_SECRET || '',
    scoreMin: parseFloat(process.env.RECAPTCHA_SCORE_MIN || '0.5')
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQ || '10', 10)
  },

  doublePaymentCheck: process.env.PSE_DOUBLE_PAYMENT_CHECK === 'true',

  polling: {
    intervalMs: parseInt(process.env.PSE_POLLING_INTERVAL_MS || '180000', 10),
    maxAttempts: parseInt(process.env.PSE_POLLING_MAX_ATTEMPTS || '10', 10)
  },

  token: {
    refreshBufferMs: 5 * 60 * 1000
  }
};

export default config;
