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

        <!-- Resultado (4 estados): encabezado por estado + comprobante unico -->
        <div v-else-if="transactionState" class="py-6">
          <!-- Encabezado por estado -->
          <div v-if="transactionState === 'OK'">
            <div class="text-green-600 text-6xl mb-2">&#9989;</div>
            <h2 class="text-2xl font-bold text-gray-900">Pago aprobado</h2>
            <p class="text-gray-600 mt-1">Tu transaccion se ha completado exitosamente.</p>
          </div>
          <div v-else-if="transactionState === 'PENDING'">
            <div class="text-yellow-600 text-6xl mb-2">&#9203;</div>
            <h2 class="text-xl font-bold text-gray-900">Pago pendiente</h2>
            <p class="text-gray-600 mt-1">Tu pago esta siendo procesado por tu entidad financiera.</p>
          </div>
          <div v-else-if="['NOT_AUTHORIZED', 'FAILED'].includes(transactionState)">
            <div class="text-red-600 text-6xl mb-2">&#10060;</div>
            <h2 class="text-xl font-bold text-gray-900">
              {{ transactionState === 'NOT_AUTHORIZED' ? 'Pago rechazado' : 'Pago fallido' }}
            </h2>
            <p class="text-gray-600 mt-1">
              {{ transactionState === 'NOT_AUTHORIZED'
                 ? 'La transaccion no fue autorizada por tu banco.'
                 : 'Ocurrio un error al procesar tu pago.' }}
            </p>
          </div>

          <!-- Comprobante de pago (Requisito PSE #11): se muestra en los 4 estados -->
          <div class="mt-6 p-4 bg-gray-50 rounded-lg text-left">
            <h3 class="font-medium text-gray-700 mb-3">Comprobante de pago</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between" v-if="receipt.nit">
                <span class="text-gray-500">NIT:</span>
                <span>{{ receipt.nit }}</span>
              </div>
              <div class="flex justify-between" v-if="receipt.companyName">
                <span class="text-gray-500">Razon social:</span>
                <span class="text-right">{{ receipt.companyName }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Estado:</span>
                <span class="font-semibold">{{ receipt.state }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Banco:</span>
                <span class="text-right">{{ receipt.bank }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">CUS:</span>
                <span class="font-mono">{{ receipt.cus }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Ticket ID:</span>
                <span class="font-mono">{{ receipt.ticketId }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Fecha:</span>
                <span>{{ receipt.date }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Valor:</span>
                <span class="font-bold">${{ receipt.amount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Descripcion:</span>
                <span class="text-right">{{ receipt.description }}</span>
              </div>
              <div class="flex justify-between" v-if="paymentModeLabel">
                <span class="text-gray-500">Medio de pago:</span>
                <span>{{ paymentModeLabel }}</span>
              </div>
              <div class="flex justify-between" v-if="paymentOriginLabel">
                <span class="text-gray-500">Tipo:</span>
                <span>{{ paymentOriginLabel }}</span>
              </div>
            </div>
          </div>

          <!-- PENDING: texto literal ACH + contacto (Requisito PSE #11) -->
          <div v-if="transactionState === 'PENDING'"
               class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <p class="text-sm text-yellow-800 font-medium">
              Por favor verificar si el debito fue realizado en el Banco.
            </p>
            <p v-if="hasContact" class="text-sm text-yellow-700 mt-2">
              Si tienes dudas, comunicate con nosotros:
              <span v-if="CONTACT_PHONE"><br />Telefono: {{ CONTACT_PHONE }}</span>
              <span v-if="CONTACT_EMAIL"><br />Correo: {{ CONTACT_EMAIL }}</span>
            </p>
          </div>

          <!-- OK -->
          <p v-else-if="transactionState === 'OK'" class="mt-4 text-xs text-gray-500">
            Recibiras el soporte de pago en tu correo electronico.
          </p>

          <!-- Rechazada / Fallida: causal + contacto -->
          <template v-else-if="['NOT_AUTHORIZED', 'FAILED'].includes(transactionState)">
            <RejectionReason
              :cause-rejection="detailed?.causeRejection"
              :rejection-description="detailed?.rejectionDescription"
              :state-description="detailed?.stateDescription"
              @retry="goToCheckout"
            />
            <div v-if="hasContact" class="mt-3 p-3 bg-gray-50 rounded-lg text-left text-sm text-gray-600">
              Para mayor informacion comunicate con nosotros:
              <span v-if="CONTACT_PHONE"><br />Telefono: {{ CONTACT_PHONE }}</span>
              <span v-if="CONTACT_EMAIL"><br />Correo: {{ CONTACT_EMAIL }}</span>
            </div>
          </template>
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
  financialInstitutionName?: string;
  paymentDescription?: string;
  serviceNIT?: string;
  serviceName?: string;
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

// Datos del comercio y contacto (Requisitos PSE #6, #7, #11)
const COMPANY_NIT: string = import.meta.env.VITE_COMPANY_NIT || '';
const COMPANY_NAME: string = import.meta.env.VITE_COMPANY_NAME || 'Junta Atlantico S.A.S.';
const CONTACT_PHONE: string = import.meta.env.VITE_CONTACT_PHONE || '';
const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL || '';

// Snapshot del formulario capturado al montar, ANTES de que clearSession()
// borre la PII: permite mostrar descripción y banco en el comprobante.
const formSnapshot = ref<{ description?: string }>({});
const bankNameSnapshot = ref<string>('');

const { start: startPolling, stop: stopPolling } = usePolling();

const paymentModeLabel: ComputedRef<string> = computed(() =>
  transaction.value.paymentMode ? getPaymentModeLabel(transaction.value.paymentMode) : ''
);
const paymentOriginLabel: ComputedRef<string> = computed(() =>
  transaction.value.paymentOrigin ? getPaymentOriginLabel(transaction.value.paymentOrigin) : ''
);

const STATE_LABELS: Record<string, string> = {
  OK: 'Aprobada',
  PENDING: 'Pendiente',
  NOT_AUTHORIZED: 'Rechazada',
  FAILED: 'Fallida'
};
const stateLabel: ComputedRef<string> = computed(
  () => STATE_LABELS[transactionState.value] || transactionState.value || '—'
);

// Comprobante unificado (Requisito PSE #11): NIT, Razón Social, Estado, Banco,
// CUS, TicketId, Fecha, Valor y Descripción. Se muestra en los 4 estados.
const receipt = computed(() => ({
  nit: COMPANY_NIT || transaction.value.serviceNIT || '',
  companyName: COMPANY_NAME || transaction.value.serviceName || '',
  state: stateLabel.value,
  bank: transaction.value.financialInstitutionName || bankNameSnapshot.value || '—',
  cus: transaction.value.trazabilityCode || '—',
  ticketId: transaction.value.ticketId || '—',
  date: transaction.value.bankProcessDate ? formatDate(transaction.value.bankProcessDate) : '—',
  amount: typeof transaction.value.transactionValue === 'number'
    ? formatCurrency(transaction.value.transactionValue) : '—',
  description: transaction.value.paymentDescription || formSnapshot.value.description || '—'
}));

const hasContact: ComputedRef<boolean> = computed(() => !!(CONTACT_PHONE || CONTACT_EMAIL));

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
  sessionStorage.removeItem('pse_bank_name');
}

// CORRECCION: detener el polling al desmontar la vista. Antes, si el usuario
// navegaba/recargaba durante el polling, el bucle seguia corriendo en segundo
// plano (hasta 30 min) disparando llamadas al backend.
onUnmounted(() => {
  stopPolling();
});

onMounted(async () => {
  // Capturar datos para el comprobante ANTES de cualquier limpieza de sesión.
  try {
    const raw = sessionStorage.getItem('pse_form_data');
    if (raw) {
      const fd = JSON.parse(raw) as { description?: string };
      formSnapshot.value = { description: fd.description };
    }
  } catch {
    /* ignore */
  }
  bankNameSnapshot.value = sessionStorage.getItem('pse_bank_name') || '';

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