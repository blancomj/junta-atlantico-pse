<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <div class="max-w-6xl mx-auto px-4 py-8">

      <div v-if="store.loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div v-else-if="store.currentPayment" class="space-y-6">
        <!-- Header card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
          <div class="flex items-center justify-between">
            <!-- Left: back + filename + stats inline -->
            <div class="flex items-center gap-4 min-w-0">
              <button @click="$router.back()" class="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div class="w-px h-8 bg-gray-200 flex-shrink-0"></div>
              <div class="min-w-0">
                <h1 class="text-base font-bold text-gray-900 truncate">{{ store.currentPayment.file_name }}</h1>
                <p class="text-xs text-gray-400">{{ formatDate(store.currentPayment.created_at) }}</p>
              </div>
            </div>

            <!-- Right: status badge -->
            <span :class="statusClass(store.currentPayment.estado)"
              class="px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider flex-shrink-0 ml-4">
              {{ statusLabel(store.currentPayment.estado) }}
            </span>
          </div>

          <!-- Stats + actions row -->
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div class="flex items-center gap-6">
              <div class="flex items-baseline gap-1.5">
                <span class="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Beneficiarios</span>
                <span class="text-sm font-bold text-gray-900">{{ store.currentPayment.total_beneficiarios }}</span>
              </div>
              <div class="w-px h-4 bg-gray-200"></div>
              <div class="flex items-baseline gap-1.5">
                <span class="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Monto</span>
                <span class="text-sm font-bold text-gray-900">${{ formatCurrency(store.currentPayment.monto_total) }}</span>
              </div>
              <template v-if="store.currentPayment.fecha_pago">
                <div class="w-px h-4 bg-gray-200"></div>
                <div class="flex items-baseline gap-1.5">
                  <span class="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Pago</span>
                  <span class="text-sm font-bold text-gray-900">{{ formatDate(store.currentPayment.fecha_pago) }}</span>
                </div>
              </template>
              <template v-if="store.currentPayment.banco_pago">
                <div class="w-px h-4 bg-gray-200"></div>
                <div class="flex items-baseline gap-1.5">
                  <span class="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Banco</span>
                  <span class="text-sm font-bold text-gray-900">{{ store.currentPayment.banco_pago }}</span>
                </div>
              </template>
            </div>

            <div v-if="store.currentPayment.estado === 'por_pagar'" class="flex items-center gap-2 flex-shrink-0 ml-4">
              <button @click="showPayModal = true"
                class="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Pagar con PSE
              </button>
              <button @click="showAnnulModal = true"
                class="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                Anular
              </button>
            </div>
          </div>
        </div>

        <!-- Beneficiaries -->
        <DataTable
          :columns="beneficiaryColumns"
          :data="store.currentPayment.beneficiaries || []"
          row-key="id"
          :page-size="10"
          search-placeholder="Buscar beneficiario..."
          empty-text="No hay beneficiarios registrados">
          <template #cell-num="slotProps">
            {{ (store.currentPayment.beneficiaries || []).findIndex((b: any) => b.id === (slotProps as any).row.id) + 1 }}
          </template>
          <template #cell-valor="{ value }">
            <span class="font-medium">${{ formatCurrency(Number(value)) }}</span>
          </template>
          <template #cell-estado="{ value }">
            <span :class="value === 'pagado' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'"
              class="px-2 py-0.5 text-xs font-medium rounded-full">
              {{ value === 'pagado' ? 'Pagado' : 'Pendiente' }}
            </span>
          </template>
        </DataTable>

        <!-- Pay Modal -->
        <div v-if="showPayModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-bold mb-4">Pagar con PSE</h3>
            <p class="text-gray-600 mb-4">Seras redirigido al formulario de pago PSE donde completaras los datos de tu banco.</p>
            <div class="flex gap-4 justify-end">
              <button @click="showPayModal = false" class="px-4 py-2 border rounded-lg">Cancelar</button>
              <button @click="handlePay"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Continuar al pago
              </button>
            </div>
          </div>
        </div>

        <!-- Annul Modal -->
        <div v-if="showAnnulModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-bold mb-4">Anular Proceso</h3>
            <textarea v-model="annulMotivo" rows="3" placeholder="Motivo de anulacion"
              class="w-full px-3 py-2 border rounded-lg mb-4"></textarea>
            <div class="flex gap-4 justify-end">
              <button @click="showAnnulModal = false" class="px-4 py-2 border rounded-lg">Cancelar</button>
              <button @click="handleAnnul" :disabled="!annulMotivo || annulling"
                class="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">
                {{ annulling ? 'Anulando...' : 'Anular' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBatchPaymentStore } from '../../stores/batch-payment.store';
import batchPaymentService from '../../services/batch-payment.service';
import NavBar from '../../components/NavBar.vue';
import DataTable from '../../components/DataTable.vue';
import type { Column } from '../../components/DataTable.vue';

const route = useRoute();
const router = useRouter();
const store = useBatchPaymentStore();

const beneficiaryColumns: Column[] = [
  { key: 'num', label: '#', align: 'center', sortable: false },
  { key: 'numero_identificacion', label: 'Identificacion' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'numero_expediente', label: 'Expediente' },
  { key: 'valor', label: 'Valor', align: 'right' },
  { key: 'estado', label: 'Estado', align: 'center' },
];

const showPayModal = ref(false);
const showAnnulModal = ref(false);
const annulMotivo = ref('');
const annulling = ref(false);

function statusClass(estado: string) {
  const classes: Record<string, string> = {
    por_pagar: 'bg-yellow-100 text-yellow-800',
    pagado: 'bg-green-100 text-green-800',
    anulado: 'bg-red-100 text-red-800'
  };
  return classes[estado] || 'bg-gray-100';
}

function statusLabel(estado: string) {
  return { por_pagar: 'Por Pagar', pagado: 'Pagado', anulado: 'Anulado' }[estado] || estado;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2 }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO');
}

async function handlePay() {
  router.push({ name: 'CheckoutBatch', params: { batchPaymentId: route.params.id } });
}

async function handleAnnul() {
  annulling.value = true;
  try {
    await batchPaymentService.annul(route.params.id as string, annulMotivo.value);
    showAnnulModal.value = false;
    store.fetchDetail(route.params.id as string);
  } catch (e: any) {
    alert(e.response?.data?.message || 'Error al anular');
  } finally {
    annulling.value = false;
  }
}

onMounted(() => {
  store.fetchDetail(route.params.id as string);
});
</script>
