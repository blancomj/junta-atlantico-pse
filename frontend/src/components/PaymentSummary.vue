<template>
  <div v-if="loading" class="flex items-center justify-center py-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
  <div v-else class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="font-medium text-gray-700 mb-3">Resumen del pago</h3>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-500">Banco:</span>
        <span>{{ bankName }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Valor:</span>
        <span class="font-bold">${{ formatCurrency(amount) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Descripcion:</span>
        <span>{{ description }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Tipo:</span>
        <span>{{ userType === 'person' ? 'Persona Natural' : 'Empresa' }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Identificacion:</span>
        <span>{{ identificationNumber }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { usePaymentStore } from '../stores/payment.store';
import { formatCurrency } from '../utils/formatters';

interface BankItem {
  financialInstitutionCode: string;
  financialInstitutionName: string;
}

const props = withDefaults(defineProps<{
  bankCode?: string;
  amount?: number;
  description?: string;
  userType?: string;
  identificationNumber?: string;
}>(), {
  bankCode: '',
  amount: 0,
  description: '',
  userType: 'person',
  identificationNumber: ''
});

const store = usePaymentStore();
const { loading } = storeToRefs(store);

const bankName: ComputedRef<string> = computed(() => {
  const bank: BankItem | undefined = store.banks.find(
    (b: BankItem) => b.financialInstitutionCode === props.bankCode
  );
  return bank ? bank.financialInstitutionName : props.bankCode;
});
</script>
