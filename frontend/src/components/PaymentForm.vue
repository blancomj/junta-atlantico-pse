<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- DATOS DEL PACIENTE (persona calificada)               -->
    <!-- Se envían a PSE como referenceNumber1 y 2 (Req. #13) -->
    <!-- Pueden ser distintos a los datos del pagador          -->
    <!-- ══════════════════════════════════════════════════════ -->
    <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 class="text-sm font-semibold text-blue-800 mb-3">
        Datos del paciente a calificar
      </h3>
      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-1">
          <label for="patientId" class="block text-sm font-medium text-gray-700 mb-1">
            No.Identificación <span class="text-red-500">*</span>
          </label>
          <input
            id="patientId"
            v-model="form.reference1"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500': fieldErrors.reference1 }"
            placeholder="Ej: 1234567890"
            maxlength="80"
            required
          />
          <p v-if="fieldErrors.reference1" class="mt-1 text-xs text-red-600">
            {{ fieldErrors.reference1 }}
          </p>
        </div>
        <div class="col-span-2">
          <label for="patientName" class="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo <span class="text-red-500">*</span>
          </label>
          <input
            id="patientName"
            v-model="form.reference2"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500': fieldErrors.reference2 }"
            placeholder="Ej: Maria Garcia Lopez"
            maxlength="80"
            required
          />
          <p v-if="fieldErrors.reference2" class="mt-1 text-xs text-red-600">
            {{ fieldErrors.reference2 }}
          </p>
        </div>
      </div>
      <p class="text-xs text-blue-600 mt-2">
        Ingrese los datos de la persona cuya calificacion de invalidez se esta pagando.
        Estos datos pueden ser diferentes a los del pagador.
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- DATOS DEL PAGADOR                                     -->
    <!-- ══════════════════════════════════════════════════════ -->

    <!-- Tipo de Persona -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Tipo de persona <span class="text-red-500">*</span>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          @click="setUserType('person')"
          class="py-2 px-4 border rounded-lg transition-colors"
          :class="form.userType === 'person'
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
        >
          <span class="block font-medium">Persona Natural</span>
          <span class="text-xs text-gray-500">Cedula de ciudadania</span>
        </button>
        <button
          type="button"
          @click="setUserType('company')"
          class="py-2 px-4 border rounded-lg transition-colors"
          :class="form.userType === 'company'
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
        >
          <span class="block font-medium">Empresa</span>
          <span class="text-xs text-gray-500">NIT</span>
        </button>
      </div>
    </div>

    <!-- Tipo y Numero de Identificacion -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="identificationType" class="block text-sm font-medium text-gray-700 mb-1">
          Tipo de identificacion <span class="text-red-500">*</span>
        </label>
        <select
          id="identificationType"
          v-model="form.identificationType"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.identificationType }"
          required
        >
          <option v-if="form.userType === 'person'" value="CedulaDeCiudadania">Cedula de Ciudadania</option>
          <option v-if="form.userType === 'person'" value="CedulaDeExtranjeria">Cedula de Extranjeria</option>
          <option v-if="form.userType === 'person'" value="Pasaporte">Pasaporte</option>
          <option v-if="form.userType === 'person'" value="TarjetaDeIdentidad">Tarjeta de Identidad</option>
          <option v-if="form.userType === 'person'" value="DocumentoDeIdentificacionExtranjero">Doc. de Identificacion Extranjero</option>
          <option v-if="form.userType === 'company'" value="NIT">NIT</option>
        </select>
        <p v-if="fieldErrors.identificationType" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.identificationType }}
        </p>
      </div>
      <div>
        <label for="identificationNumber" class="block text-sm font-medium text-gray-700 mb-1">
          Numero de identificacion <span class="text-red-500">*</span>
        </label>
        <input
          id="identificationNumber"
          v-model="form.identificationNumber"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.identificationNumber }"
          placeholder="Ej: 1234567890"
          required
        />
        <p v-if="fieldErrors.identificationNumber" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.identificationNumber }}
        </p>
      </div>
    </div>

    <!-- Nombre completo -->
    <div>
      <label for="fullName" class="block text-sm font-medium text-gray-700 mb-1">
        Nombre completo <span class="text-red-500">*</span>
      </label>
      <input
        id="fullName"
        v-model="form.fullName"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.fullName }"
        placeholder="Ej: Juan Perez Gomez"
        required
      />
      <p v-if="fieldErrors.fullName" class="mt-1 text-xs text-red-600">{{ fieldErrors.fullName }}</p>
    </div>

    <!-- Celular y Email -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="cellphoneNumber" class="block text-sm font-medium text-gray-700 mb-1">
          Celular <span class="text-red-500">*</span>
        </label>
        <input
          id="cellphoneNumber"
          v-model="form.cellphoneNumber"
          type="tel"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.cellphoneNumber }"
          placeholder="3001234567"
          maxlength="10"
          required
        />
        <p v-if="fieldErrors.cellphoneNumber" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.cellphoneNumber }}
        </p>
      </div>
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          Correo electronico <span class="text-red-500">*</span>
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.email }"
          placeholder="ejemplo@correo.com"
          required
        />
        <p v-if="fieldErrors.email" class="mt-1 text-xs text-red-600">{{ fieldErrors.email }}</p>
      </div>
    </div>

    <!-- Direccion -->
    <div>
      <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
        Direccion <span class="text-red-500">*</span>
      </label>
      <input
        id="address"
        v-model="form.address"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.address }"
        placeholder="Calle Falsa 123"
        required
      />
      <p v-if="fieldErrors.address" class="mt-1 text-xs text-red-600">{{ fieldErrors.address }}</p>
    </div>

    <!-- Monto -->
    <div>
      <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
        Valor a pagar <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium">$</span>
        <input
          id="amount"
          v-model.number="form.amount"
          type="number"
          step="0.01"
          min="0.01"
          class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.amount }"
          placeholder="0.00"
          required
        />
      </div>
      <p v-if="fieldErrors.amount" class="mt-1 text-xs text-red-600">{{ fieldErrors.amount }}</p>
    </div>

    <!-- Descripcion -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
        Descripcion del pago <span class="text-red-500">*</span>
      </label>
      <input
        id="description"
        v-model="form.description"
        type="text"
        @input="validateForbiddenChars"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.description || fieldErrors.forbiddenChars }"
        placeholder="Ej: Pago de calificacion de invalidez"
        maxlength="80"
        required
      />
      <div class="flex justify-between mt-1">
        <p class="text-xs text-red-600">{{ fieldErrors.description || fieldErrors.forbiddenChars }}</p>
        <p class="text-xs text-gray-500">
          {{ form.description ? 80 - form.description.length : 80 }} caracteres restantes
        </p>
      </div>
    </div>

    <!-- Lista de bancos -->
    <BankList v-model="form.bankCode" :error="fieldErrors.bankCode" />

    <!-- Badge reCAPTCHA -->
    <p class="text-xs text-gray-500 text-center">
      Este sitio esta protegido por reCAPTCHA y se aplican la
      <a href="https://policies.google.com/privacy" class="underline" target="_blank">Politica de privacidad</a> y
      <a href="https://policies.google.com/terms" class="underline" target="_blank">Terminos del servicio</a> de Google.
    </p>

    <!-- Botones -->
    <div class="flex flex-col sm:flex-row gap-4 pt-4">
      <button
        type="submit"
        :disabled="loading || !isFormValid"
        class="flex-1 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="loading">
          <svg class="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loadingMessage }}
        </span>
        <span v-else>Debito Bancario PSE</span>
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        :disabled="loading"
        class="py-3 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        Cancelar
      </button>
    </div>

    <!-- Errores -->
    <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-sm text-red-600 flex items-start">
        <span class="mr-2">&#10060;</span>
        <span>{{ error }}</span>
      </p>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, Ref, ComputedRef } from 'vue';
import BankList from './BankList.vue';
import apiService from '../services/api.service';
import { useReCaptcha } from '../composables/useReCaptcha';
import { validateForm, validateNoForbiddenChars, ValidationErrors } from '../utils/validators';
import { getErrorMessage } from '../utils/errorMessages';

interface SuccessPayload {
  trazabilityCode: string;
  pseURL: string;
  ticketId: string;
  formData: FormData;
}

interface ErrorPayload {
  code: string;
  message: string;
}

interface FormData {
  bankCode: string;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  email: string;
  address: string;
  description: string;
  amount: number | null;
  userType: string;
  identificationType: string;
  // Datos del PACIENTE (persona calificada — puede diferir del pagador)
  // Se envían a PSE como referenceNumber1 y referenceNumber2 (Requisito #13)
  reference1: string;   // identificación del paciente
  reference2: string;   // nombre completo del paciente
  reference3?: string;  // trazabilidad interna (ticketId — generado por backend)
  serviceCode?: string;
  vat?: number;
}

interface ApiResponse {
  success: boolean;
  data?: {
    trazabilityCode: string;
    ticketId: string;
    pseURL: string;
  };
  message?: string;
  code?: string;
}

const emit = defineEmits<{
  (e: 'success', payload: SuccessPayload): void;
  (e: 'cancel'): void;
  (e: 'error', payload: ErrorPayload): void;
  (e: 'loading', isLoading: boolean): void;
}>();

const loading: Ref<boolean> = ref(false);
const error: Ref<string> = ref('');
const fieldErrors: Ref<ValidationErrors> = ref({});
const loadingMessage: Ref<string> = ref('Procesando...');

const { init: initRecaptcha } = useReCaptcha();
initRecaptcha();

const form: FormData = reactive({
  userType: 'person',
  identificationType: 'CedulaDeCiudadania',
  identificationNumber: '',
  fullName: '',
  cellphoneNumber: '',
  email: '',
  address: '',
  amount: null,
  description: '',
  bankCode: '',
  serviceCode: import.meta.env.VITE_PSE_SERVICE_CODE || '',
  vat: 0,
  reference1: '',   // identificación del paciente
  reference2: '',   // nombre del paciente
  reference3: ''    // trazabilidad interna (backend lo completa con ticketId)
});

const isFormValid: ComputedRef<boolean> = computed(() => {
  return !!(
    form.bankCode &&
    form.identificationNumber?.trim() &&
    form.fullName?.trim() &&
    form.cellphoneNumber?.trim() &&
    form.email?.trim() &&
    form.address?.trim() &&
    form.amount && form.amount > 0 &&
    form.description?.trim() &&
    form.reference1?.trim() &&   // ID del paciente obligatorio
    form.reference2?.trim()      // Nombre del paciente obligatorio
  );
});

function setUserType(type: string): void {
  form.userType = type;
  if (type === 'company') {
    form.identificationType = 'NIT';
  } else {
    form.identificationType = 'CedulaDeCiudadania';
  }
}

function validateForbiddenChars(): void {
  const err: string | null = validateNoForbiddenChars('description', form.description);
  if (err) {
    fieldErrors.value.forbiddenChars = err;
  } else {
    delete fieldErrors.value.forbiddenChars;
  }
}

watch(() => form.cellphoneNumber, (newVal: string) => {
  form.cellphoneNumber = String(newVal).replace(/\D/g, '').slice(0, 10);
});

watch(loading, (newVal: boolean) => {
  loadingMessage.value = newVal ? 'Creando transaccion...' : 'Procesando...';
  emit('loading', newVal);
});

async function handleSubmit(): Promise<void> {
  error.value = '';
  fieldErrors.value = {};

  const errors: ValidationErrors = validateForm(form);
  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors;
    error.value = 'Por favor completa todos los campos requeridos correctamente';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (!form.serviceCode) {
    error.value = 'Error de configuracion: Codigo de servicio no definido';
    return;
  }

  loading.value = true;

  try {
    const response: ApiResponse = await apiService.createTransaction(form) as ApiResponse;

    if (response.success && response.data) {
      sessionStorage.setItem('pse_trazability_code', response.data.trazabilityCode);
      sessionStorage.setItem('pse_ticket_id', response.data.ticketId);
      sessionStorage.setItem('pse_form_data', JSON.stringify(form));

      emit('success', {
        trazabilityCode: response.data.trazabilityCode,
        pseURL: response.data.pseURL,
        ticketId: response.data.ticketId,
        formData: { ...form }
      });
    } else {
      const message: string = response.message || getErrorMessage(response.code || '');
      error.value = message;
      emit('error', { code: response.code || '', message });
    }
  } catch (err) {
    const e = err as { message?: string; code?: string };
    const message: string = e.message || getErrorMessage(e.code || '');
    error.value = message;
    emit('error', { code: e.code || '', message });
  } finally {
    loading.value = false;
  }
}
</script>