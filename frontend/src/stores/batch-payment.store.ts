import { defineStore } from 'pinia';
import { BatchPayment } from '../types/batch-payment.types';
import batchPaymentService from '../services/batch-payment.service';

interface BatchPaymentState {
  payments: BatchPayment[];
  currentPayment: any;
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
}

export const useBatchPaymentStore = defineStore('batchPayment', {
  state: (): BatchPaymentState => ({
    payments: [],
    currentPayment: null,
    total: 0,
    page: 1,
    loading: false,
    error: null
  }),

  actions: {
    async fetchPayments(params?: { page?: number; estado?: string }): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const result = await batchPaymentService.list(params);
        this.payments = result.data;
        this.total = result.total;
        this.page = params?.page || 1;
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Error al cargar pagos';
      } finally {
        this.loading = false;
      }
    },

    async fetchDetail(id: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        this.currentPayment = await batchPaymentService.getDetail(id);
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Error al cargar detalle';
      } finally {
        this.loading = false;
      }
    },

    reset(): void {
      this.payments = [];
      this.currentPayment = null;
      this.total = 0;
      this.page = 1;
      this.error = null;
    }
  }
});
