<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Mis Procesos de Pago</h1>
      </div>

      <!-- Filters -->
      <div class="bg-blue-50 rounded-lg shadow p-4 mb-6 flex gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select v-model="filterEstado" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">Todos</option>
            <option value="por_pagar">Por Pagar</option>
            <option value="pagado">Pagado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
        <button @click="loadPayments" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          Filtrar
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <!-- DataTable -->
      <DataTable v-else :columns="columns" :data="payments" row-key="id" :searchable="false"
        :page-size="15">
        <template #cell-num="slotProps">
          {{ payments.findIndex(p => p.id === (slotProps as any).row.id) + 1 }}
        </template>
        <template #cell-estado="{ value }">
          <span :class="statusClass(value)" class="px-2 py-1 text-xs rounded-full">
            {{ statusLabel(value) }}
          </span>
        </template>
        <template #cell-monto_total="{ value }">
          <span class="font-medium">${{ formatCurrency(Number(value)) }}</span>
        </template>
        <template #cell-banco_pago="{ value }">
          {{ value || '—' }}
        </template>
        <template #cell-fecha_pago="slotProps">
          {{ (slotProps as any).row.fecha_pago ? formatDate((slotProps as any).row.fecha_pago) : formatDate((slotProps as any).row.created_at) }}
        </template>
        <template #cell-documento_pago="{ value }">
          {{ value || '—' }}
        </template>
        <template #cell-id="slotProps">
          <router-link :to="`/batch-payments/${(slotProps as any).row.id}`"
            class="text-blue-600 hover:underline text-sm">Ver detalle</router-link>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Dashboard' });

import { ref, onMounted } from 'vue';
import NavBar from '../../components/NavBar.vue';
import DataTable, { type Column } from '../../components/DataTable.vue';
import batchPaymentService from '../../services/batch-payment.service';
import { BatchPayment } from '../../types/batch-payment.types';

const columns: Column[] = [
  { key: 'num', label: '#', align: 'center', sortable: false },
  { key: 'file_name', label: 'Archivo' },
  { key: 'estado', label: 'Estado' },
  { key: 'total_beneficiarios', label: 'Beneficiarios', align: 'right' },
  { key: 'monto_total', label: 'Monto Total', align: 'right' },
  { key: 'banco_pago', label: 'Banco' },
  { key: 'fecha_pago', label: 'Fecha Pago' },
  { key: 'documento_pago', label: 'Comprobante' },
  { key: 'id', label: 'Accion', align: 'center', sortable: false },
];

const payments = ref<BatchPayment[]>([]);
const loading = ref(false);
const filterEstado = ref('');

function statusClass(estado: string) {
  const c: Record<string, string> = {
    por_pagar: 'bg-yellow-100 text-yellow-800',
    pagado: 'bg-green-100 text-green-800',
    anulado: 'bg-red-100 text-red-800'
  };
  return c[estado] || 'bg-gray-100';
}

function statusLabel(estado: string) {
  return ({ por_pagar: 'Por Pagar', pagado: 'Pagado', anulado: 'Anulado' } as Record<string, string>)[estado] || estado;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO');
}

async function loadPayments() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: 1, pageSize: 10000 };
    if (filterEstado.value) params.estado = filterEstado.value;
    const result = await batchPaymentService.list(params);
    payments.value = result.data;
  } catch (e) {
    console.error('Error loading payments', e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadPayments);
</script>
