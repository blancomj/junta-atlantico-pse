import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { BatchPayment, UploadResult } from '../types/batch-payment.types';
import authService from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse';
const API_ROOT = BASE_URL.replace(/\/pse$/, '');

class BatchPaymentService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_ROOT,
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
      (response) => response,
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

        return Promise.reject(error);
      }
    );
  }

  async uploadExcel(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/batch-payments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }

  async createPayment(fileId: string): Promise<BatchPayment> {
    const response = await this.client.post('/batch-payments', { fileId });
    return response.data.data;
  }

  async list(params?: { page?: number; pageSize?: number; estado?: string; tipo?: string; userId?: string; fechaDesde?: string; fechaHasta?: string }): Promise<{ data: BatchPayment[]; total: number }> {
    const response = await this.client.get('/batch-payments', { params });
    return response.data;
  }

  async getDetail(id: string): Promise<any> {
    const response = await this.client.get(`/batch-payments/${id}`);
    return response.data.data;
  }

  async annul(id: string, motivo: string): Promise<BatchPayment> {
    const response = await this.client.post(`/batch-payments/${id}/annul`, { motivo });
    return response.data.data;
  }

  async pay(id: string, bankCode: string): Promise<{ trazabilityCode: string; pseURL: string }> {
    const response = await this.client.post(`/batch-payments/${id}/pay`, { bankCode });
    return response.data.data;
  }
}

export default new BatchPaymentService();
