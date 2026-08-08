<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <div class="max-w-7xl mx-auto px-4 py-8">
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
        <template #toolbar>
          <div class="flex items-center gap-2">
            <div class="relative">
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input v-model="beneficiarySearch" @keyup.enter="searchBeneficiary" type="text"
                placeholder="Paciente, identificacion o expediente..."
                class="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-72" />
              <button v-if="beneficiarySearch" @click="clearBeneficiarySearch"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button @click="searchBeneficiary"
              class="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 font-medium">
              Buscar
            </button>
          </div>
        </template>
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
import authService from '../../services/auth.service';
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
const beneficiarySearch = ref('');

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

async function searchBeneficiary() {
  if (!beneficiarySearch.value || beneficiarySearch.value.trim().length < 2) {
    loadPayments();
    return;
  }

  loading.value = true;
  try {
    const token = authService.getToken();
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse').replace(/\/pse$/, '');
    const res = await fetch(`${baseUrl}/batch-payments/search-beneficiary?q=${encodeURIComponent(beneficiarySearch.value)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error en la busqueda');
    const json = await res.json();
    payments.value = json.data || [];
  } catch (e) {
    console.error('Error searching beneficiary', e);
    payments.value = [];
  } finally {
    loading.value = false;
  }
}

function clearBeneficiarySearch() {
  beneficiarySearch.value = '';
  loadPayments();
}

onMounted(loadPayments);
</script>
