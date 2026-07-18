import axios from 'axios';
import config from '../config/pse.config';
import logger from '../utils/logger';

class TokenService {
  private accessToken: string | null;
  private tokenExpiry: number | null;

  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    return await this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    try {
      logger.info('Renovando token OAuth 2.0...');

      const response = await axios({
        method: 'POST',
        url: config.tokenUrl,
        data: {
          client_id: config.clientId,
          client_secret: config.clientSecret
        },
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (!response.data.access_token) {
        throw new Error('No se recibio access_token en la respuesta');
      }

      this.accessToken = response.data.access_token;
      const expiresIn: number = (response.data.expires_in || 3600) - config.token.refreshBufferMs / 1000;
      this.tokenExpiry = Date.now() + (expiresIn * 1000);

      logger.info(`Token obtenido. Vence en ${expiresIn}s`);
      return this.accessToken!;
    } catch (error) {
      const axiosError = error as { response?: { data?: { error_description?: string } }; message: string };
      logger.error('Error renovando token:', axiosError.response?.data || axiosError.message);
      throw new Error(`OAuth Error: ${axiosError.response?.data?.error_description || axiosError.message}`);
    }
  }

  invalidate(): void {
    this.accessToken = null;
    this.tokenExpiry = null;
  }
}

export default new TokenService();
