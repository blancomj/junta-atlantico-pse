import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import recaptchaService from './recaptcha.service';
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

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
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
    let recaptchaToken: string | null = null;
    try {
      recaptchaToken = await recaptchaService.execute('pse_payment');
    } catch (err) {
      console.warn('reCAPTCHA no disponible, continuando sin el:', err);
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
