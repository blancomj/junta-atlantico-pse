<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:flex sm:items-center sm:justify-center">
    <div class="max-w-lg mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <img src="/junta-atlantico-logo.svg" alt="Junta Atlantico" class="h-16 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900">Pago PSE</h1>
        <p class="text-gray-600 mt-1">Junta Regional de Calificacion de Invalidez del Atlantico</p>
      </div>

      <!-- Formulario -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden p-6">
        <PaymentForm
          @success="handleSuccess"
          @error="handleError"
          @cancel="handleCancel"
          @loading="handleLoading"
        />
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-500 mt-6">
        Debito Bancario PSE - Junta Atlantico S.A.S.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import PaymentForm from '../components/PaymentForm.vue';

interface SuccessPayload {
  trazabilityCode: string;
  pseURL: string;
}

interface ErrorPayload {
  code: string;
  message: string;
}

const router = useRouter();

function handleSuccess({ trazabilityCode, pseURL }: SuccessPayload): void {
  if (pseURL) {
    window.location.href = pseURL;
  } else {
    router.push({
      name: 'PaymentReturn',
      query: { trazabilityCode }
    });
  }
}

function handleError({ code, message }: ErrorPayload): void {
  console.error('Error en pago:', code, message);
}

function handleCancel(): void {
  router.push('/');
}

function handleLoading(_isLoading: boolean): void {
  // Optional: handle global loading state
}
</script>
