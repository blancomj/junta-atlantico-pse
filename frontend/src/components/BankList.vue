<template>
  <div class="mb-6">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Banco <span class="text-red-500">*</span>
    </label>
    <div v-if="loading" class="flex items-center justify-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span class="ml-2 text-sm text-gray-500">Cargando bancos...</span>
    </div>
    <select
      v-else
      :value="modelValue"
      @change="onSelect(($event.target as HTMLSelectElement).value)"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      :class="{ 'border-red-500': error }"
    >
      <option value="" disabled>Selecciona tu banco</option>
      <option
        v-for="bank in banks"
        :key="bank.financialInstitutionCode"
        :value="bank.financialInstitutionCode"
      >
        {{ bank.financialInstitutionName }}
      </option>
    </select>
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePaymentStore } from '../stores/payment.store';

defineProps<{
  modelValue?: string;
  error?: string;
}>();

const store = usePaymentStore();

const { loading, banks } = storeToRefs(store);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// Emite la selección y persiste el NOMBRE del banco para poder mostrarlo en el
// comprobante final (Requisito PSE #11), ya que el formulario solo maneja el código.
function onSelect(code: string): void {
  emit('update:modelValue', code);
  const bank = store.banks.find((b) => b.financialInstitutionCode === code);
  if (bank) {
    sessionStorage.setItem('pse_bank_name', bank.financialInstitutionName);
  }
}

onMounted(() => {
  if (store.banks.length === 0) {
    store.fetchBanks();
  }
});
</script>