import { defineStore } from 'pinia';
import apiService from '../services/api.service';

interface BankItem {
  financialInstitutionCode: string;
  financialInstitutionName: string;
}

interface PaymentState {
  banks: BankItem[];
  loading: boolean;
  error: string | null;
  transactionResult: Record<string, unknown> | null;
  transactionStatus: Record<string, unknown> | null;
  transactionDetailed: Record<string, unknown> | null;
}

export const usePaymentStore = defineStore('payment', {
  state: (): PaymentState => ({
    banks: [],
    loading: false,
    error: null,
    transactionResult: null,
    transactionStatus: null,
    transactionDetailed: null
  }),

  actions: {
    async fetchBanks(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiService.getBanks();
        if (response.success) {
          this.banks = response.data;
        }
      } catch (err) {
        this.error = (err as Error).message || 'Error al cargar bancos';
      } finally {
        this.loading = false;
      }
    },

    async createTransaction(paymentData: Record<string, unknown>): Promise<Record<string, unknown>> {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiService.createTransaction(paymentData);
        if (response.success) {
          this.transactionResult = response as unknown as Record<string, unknown>;
        }
        return response as unknown as Record<string, unknown>;
      } catch (err) {
        this.error = (err as Error).message || 'Error al crear transaccion';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async checkStatus(trazabilityCode: string): Promise<Record<string, unknown>> {
      try {
        const response = await apiService.getTransactionStatus(trazabilityCode);
        if (response.success) {
          this.transactionStatus = response.data;
        }
        return response as unknown as Record<string, unknown>;
      } catch (err) {
        this.error = (err as Error).message || 'Error al consultar estado';
        throw err;
      }
    },

    async fetchDetailed(trazabilityCode: string): Promise<Record<string, unknown> | undefined> {
      try {
        const response = await apiService.getTransactionDetailed(trazabilityCode);
        if (response.success) {
          this.transactionDetailed = response.data;
        }
        return response as unknown as Record<string, unknown>;
      } catch (err) {
        console.warn('Error cargando detalle:', err);
        return undefined;
      }
    },

    reset(): void {
      this.transactionResult = null;
      this.transactionStatus = null;
      this.transactionDetailed = null;
      this.error = null;
    }
  }
});
