export interface PSEConfig {
  env: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
  encryptionIv: string;
  entityCode: string;
  serviceCode: string;
  ciiuCategory: string;
  companyName: string;
  tokenUrl: string;
  apiBaseUrl: string;
  returnUrl: string;
  recaptcha: {
    secret: string;
    scoreMin: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  doublePaymentCheck: boolean;
  polling: {
    intervalMs: number;
    maxAttempts: number;
  };
  token: {
    refreshBufferMs: number;
  };
}
