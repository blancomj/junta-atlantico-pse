import axios from 'axios';
import { BatchPayment, UploadResult } from '../types/batch-payment.types';
import authService from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse';
const API_ROOT = BASE_URL.replace(/\/pse$/, '');

class BatchPaymentService {
  private getClient() {
    return axios.create({
      baseURL: API_ROOT,
      headers: {
        Authorization: `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async uploadExcel(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_ROOT}/batch-payments/upload`, formData, {
      headers: {
        Authorization: `Bearer ${authService.getToken()}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data;
  }

  async createPayment(fileId: string): Promise<BatchPayment> {
    const client = this.getClient();
    const response = await client.post('/batch-payments', { fileId });
    return response.data.data;
  }

  async list(params?: { page?: number; pageSize?: number; estado?: string; userId?: string; fechaDesde?: string; fechaHasta?: string }): Promise<{ data: BatchPayment[]; total: number }> {
    const client = this.getClient();
    const response = await client.get('/batch-payments', { params });
    return response.data;
  }

  async getDetail(id: string): Promise<any> {
    const client = this.getClient();
    const response = await client.get(`/batch-payments/${id}`);
    return response.data.data;
  }

  async annul(id: string, motivo: string): Promise<BatchPayment> {
    const client = this.getClient();
    const response = await client.post(`/batch-payments/${id}/annul`, { motivo });
    return response.data.data;
  }

  async pay(id: string, bankCode: string): Promise<{ trazabilityCode: string; pseURL: string }> {
    const client = this.getClient();
    const response = await client.post(`/batch-payments/${id}/pay`, { bankCode });
    return response.data.data;
  }
}

export default new BatchPaymentService();
