<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:flex sm:items-center sm:justify-center">
    <div class="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div class="p-6 text-center">
        <!-- Header con logo -->
        <img src="/junta-atlantico-logo.svg" alt="Junta Atlantico" class="h-12 mx-auto mb-4" />

        <!-- Loading -->
        <div v-if="loading" class="py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Verificando el estado de tu pago...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="py-8">
          <div class="text-red-600 text-6xl mb-4">&#10060;</div>
          <h2 class="text-xl font-bold text-gray-900">Error</h2>
          <p class="text-gray-600 mt-2">{{ error }}</p>
          <button
            @click="goToCheckout"
            class="mt-4 py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al inicio
          </button>
        </div>

        <!-- Estado: Aprobado -->
        <div v-else-if="transactionState === 'OK'" class="py-8">
          <div class="text-green-600 text-6xl mb-4">&#9989;</div>
          <h2 class="text-2xl font-bold text-gray-900">Pago aprobado!</h2>
          <p class="text-gray-600 mt-2">Tu transaccion se ha completado exitosamente</p>

          <div class="mt-6 p-4 bg-gray-50 rounded-lg text-left">
            <h3 class="font-medium text-gray-700 mb-3">Detalles de la transaccion</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">CUS:</span>
                <span class="font-mono">{{ transaction.trazabilityCode }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Ticket ID:</span>
                <span class="font-mono">{{ transaction.ticketId }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Valor:</span>
                <span class="font-bold">${{ formatCurrency(transaction.transactionValue) }}</span>
              </div>
              <div class="flex justify-between" v-if="transaction.paymentMode">
                <span class="text-gray-500">Medio de pago:</span>
                <span>{{ paymentModeLabel }}</span>
              </div>
              <div class="flex justify-between" v-if="transaction.paymentOrigin">
                <span class="text-gray-500">Tipo:</span>
                <span>{{ paymentOriginLabel }}</span>
              </div>
              <div class="flex justify-between" v-if="transaction.bankProcessDate">
                <span class="text-gray-500">Fecha:</span>
                <span>{{ formatDate(transaction.bankProcessDate) }}</span>
              </div>
            </div>
          </div>

          <p class="mt-4 text-xs text-gray-500">
            Recibiras el soporte de pago en tu correo electronico.
          </p>
        </div>

        <!-- Estado: Rechazado / Fallido -->
        <div v-else-if="['NOT_AUTHORIZED', 'FAILED'].includes(transactionState)" class="py-8">
          <div class="text-red-600 text-6xl mb-4">&#10060;</div>
          <h2 class="text-xl font-bold text-gray-900">
            {{ transactionState === 'NOT_AUTHORIZED' ? 'Pago rechazado' : 'Pago fallido' }}
          </h2>
          <p class="text-gray-600 mt-2">
            {{ transactionState === 'NOT_AUTHORIZED'
               ? 'La transaccion no fue autorizada por tu banco'
               : 'Ocurrio un error al procesar tu pago' }}
          </p>

          <RejectionReason
            :cause-rejection="detailed?.causeRejection"
            :rejection-description="detailed?.rejectionDescription"
            :state-description="detailed?.stateDescription"
            @retry="goToCheckout"
          />
        </div>

        <!-- Estado: Pendiente -->
        <div v-else-if="transactionState === 'PENDING'" class="py-8">
          <div class="text-yellow-600 text-6xl mb-4">&#9203;</div>
          <h2 class="text-xl font-bold text-gray-900">Pago pendiente</h2>
          <p class="text-gray-600 mt-2">
            Tu pago esta siendo procesado por tu entidad financiera.
            Te notificaremos por correo en unos minutos.
          </p>
          <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-sm text-yellow-700">
              CUS: <span class="font-mono font-bold">{{ transaction.trazabilityCode }}</span>
            </p>
          </div>
        </div>

        <!-- Boton de volver -->
        <div v-if="!loading && transactionState" class="mt-6 pt-6 border-t">
          <button
            @click="goToCheckout"
            class="py-2 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, Ref, ComputedRef } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/api.service';
import RejectionReason from '../components/RejectionReason.vue';
import { formatCurrency } from '../utils/formatters';
import { getPaymentModeLabel, getPaymentOriginLabel } from '../utils/paymentMode';
import { usePolling } from '../composables/usePolling';

interface TransactionData {
  trazabilityCode?: string;
  ticketId?: string;
  transactionValue?: number;
  paymentMode?: number;
  paymentOrigin?: number;
  bankProcessDate?: string;
  transactionState?: string;
}

interface DetailedData {
  causeRejection?: string;
  rejectionDescription?: string;
  stateDescription?: string;
}

interface PollingResult {
  transactionState: string;
}

const router = useRouter();
const loading: Ref<boolean> = ref(true);
const error: Ref<string> = ref('');
const transaction: Ref<TransactionData> = ref({});
const transactionState: Ref<string> = ref('');
const detailed: Ref<DetailedData | null> = ref(null);

const { start: startPolling, stop: stopPolling } = usePolling();

const paymentModeLabel: ComputedRef<string> = computed(() =>
  transaction.value.paymentMode ? getPaymentModeLabel(transaction.value.paymentMode) : ''
);
const paymentOriginLabel: ComputedRef<string> = computed(() =>
  transaction.value.paymentOrigin ? getPaymentOriginLabel(transaction.value.paymentOrigin) : ''
);

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  } catch {
    return iso;
  }
}

// Limpia toda la informacion de la transaccion del navegador, incluyendo
// pse_form_data (nombre, email, celular, direccion, identificacion).
function clearSession(): void {
  sessionStorage.removeItem('pse_trazability_code');
  sessionStorage.removeItem('pse_ticket_id');
  sessionStorage.removeItem('pse_form_data');
}

// CORRECCION: detener el polling al desmontar la vista. Antes, si el usuario
// navegaba/recargaba durante el polling, el bucle seguia corriendo en segundo
// plano (hasta 30 min) disparando llamadas al backend.
onUnmounted(() => {
  stopPolling();
});

onMounted(async () => {
  let trazabilityCode: string | null = new URLSearchParams(window.location.search).get('trazabilityCode');
  if (!trazabilityCode) {
    trazabilityCode = sessionStorage.getItem('pse_trazability_code');
  }

  if (!trazabilityCode) {
    error.value = 'No se encontro informacion de la transaccion';
    loading.value = false;
    return;
  }

  await checkTransactionWithPolling(trazabilityCode);
});

async function checkTransactionWithPolling(trazabilityCode: string): Promise<void> {
  try {
    loading.value = true;

    const result: PollingResult = await startPolling(
      async () => {
        const r = await apiService.getTransactionStatus(trazabilityCode);
        if (r.success) {
          transaction.value = r.data as TransactionData;
          transactionState.value = (r.data as TransactionData).transactionState || '';
        }
        return { transactionState: transactionState.value, ...r.data };
      },
      (res: PollingResult) => {
        if (res.transactionState !== 'PENDING') {
          loadDetailedIfNeeded(trazabilityCode);
        }
      },
      (err: Error) => {
        error.value = err.message || 'Error al consultar el estado';
      }
    );

    if (result?.transactionState === 'TIMEOUT') {
      error.value = 'La transaccion esta tardando mas de lo esperado. Verifica el estado mas tarde.';
    }
  } catch (err) {
    error.value = (err as Error).message || 'Error al consultar el estado del pago';
  } finally {
    loading.value = false;
  }
}

async function loadDetailedIfNeeded(trazabilityCode: string): Promise<void> {
  if (transactionState.value === 'OK') {
    clearSession();
    return;
  }

  try {
    const r = await apiService.getTransactionDetailed(trazabilityCode);
    if (r.success) {
      detailed.value = r.data as DetailedData;
    }
  } catch (err) {
    console.warn('No se pudo cargar detalle:', err);
  }

  // Estados terminales no exitosos: se borra al menos la PII del navegador.
  if (['NOT_AUTHORIZED', 'FAILED'].includes(transactionState.value)) {
    clearSession();
  }
}

function goToCheckout(): void {
  stopPolling();
  router.push('/checkout');
}
</script>