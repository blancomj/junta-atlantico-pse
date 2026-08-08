import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import recaptchaService from './recaptcha.service';
import authService from './auth.service';
import { APIErrorResponse } from '../../../shared/types/errors';

interface CreateTransactionResponse {
  success: boolean;
  data?: {
    trazabilityCode: string;
    pseURL: string;
    ticketId: number | string;
    transactionCycle: number;
  };
  message: string;
  code?: string;
}

interface BankListResponse {
  success: boolean;
  data: Array<{
    financialInstitutionCode: string;
    financialInstitutionName: string;
  }>;
  message: string;
}

class APIService {
  private baseURL: string;
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = authService.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.client(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await authService.refreshAccessToken();
            this.failedQueue.forEach(({ resolve }) => resolve(newToken));
            this.failedQueue = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        if (error.response) {
          const data = error.response.data as Record<string, unknown>;
          throw {
            status: error.response.status,
            code: (data as any)?.code,
            message: (data as any)?.message || error.message,
            data: error.response.data
          } as APIErrorResponse;
        } else if (error.request) {
          throw { status: 0, code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor' } as APIErrorResponse;
        } else {
          throw { status: 0, code: 'UNKNOWN', message: error.message } as APIErrorResponse;
        }
      }
    );
  }

  async getBanks(): Promise<BankListResponse> {
    const response = await this.client.get<BankListResponse>('/banks');
    return response.data;
  }

  async createTransaction(data: Record<string, any>): Promise<CreateTransactionResponse> {
    let recaptchaToken: string;
    try {
      recaptchaToken = await recaptchaService.execute('pse_payment');
    } catch (err) {
      console.error('Error generando token reCAPTCHA:', err);
      throw {
        status: 0,
        code: 'RECAPTCHA_UNAVAILABLE',
        message:
          'No se pudo inicializar la verificacion de seguridad (reCAPTCHA). ' +
          'Recarga la pagina e intenta de nuevo. Si el problema persiste, ' +
          'verifica tu conexion o desactiva bloqueadores de contenido.'
      } as APIErrorResponse;
    }

    const response = await this.client.post<CreateTransactionResponse>('/transaction', {
      ...data,
      recaptchaToken
    });
    return response.data;
  }

  async getTransactionStatus(trazabilityCode: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const response = await this.client.get(`/transaction/${trazabilityCode}/status`);
    return response.data;
  }

  async getTransactionDetailed(trazabilityCode: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const response = await this.client.get(`/transaction/${trazabilityCode}/detailed`);
    return response.data;
  }

  async finalizeTransaction(data: Record<string, unknown>): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const response = await this.client.post('/transaction/finalize', data);
    return response.data;
  }
}

export default new APIService();
