<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
    <div class="max-w-3xl w-full">
      <!-- Header -->
      <div class="flex items-center justify-center gap-5 sm:gap-8 mb-10">
        <img
          src="/junta-atlantico-nombre-completo.png"
          alt="Junta Regional de Calificacion de Invalidez del Atlantico"
          class="h-10 sm:h-14 w-auto"
        />
        <div class="w-px h-9 sm:h-12 bg-gray-300"></div>
        <img
          src="/logos-pse.png"
          alt="PSE - Pagos Seguros en Linea"
          class="h-10 sm:h-14 w-auto"
        />
      </div>

      <!-- Intro -->
      <p class="text-center text-sm text-gray-600 max-w-xl mx-auto mb-8">
        Selecciona la opcion que corresponda a tu caso para continuar con el pago.
      </p>

      <!-- Tarjetas de modalidad -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Pago Paciente Individual -->
        <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col">
          <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 mb-2">Pago Paciente Individual</h2>
          <p class="text-sm text-gray-600 flex-1">
            Para personas naturales que van a pagar el proceso de calificacion de un unico paciente.
            No necesitas crear una cuenta ni iniciar sesion: llenas el formulario y pagas de inmediato con PSE.
          </p>
          <button
            @click="goToIndividualPayment"
            class="mt-5 w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Pagar ahora
          </button>
        </div>

        <!-- Pago de Entidades -->
        <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col">
          <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2M5 21H3m4-14h6m-6 4h6m-6 4h6" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 mb-2">Pago de Entidades</h2>
          <p class="text-sm text-gray-600 flex-1">
            Para empresas y entidades que van a pagar por varios beneficiarios a la vez.
            Requiere iniciar sesion con tu cuenta de entidad para cargar el archivo de beneficiarios y gestionar tus pagos.
          </p>
          <button
            @click="goToEntityPayment"
            class="mt-5 w-full py-3 px-6 bg-white text-blue-600 font-medium rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            {{ authStore.isAuthenticated ? 'Ir a mi panel' : 'Iniciar sesion' }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-500 mt-10">
        Debito Bancario PSE - Junta Atlantico S.A.S.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

function goToIndividualPayment(): void {
  router.push({ name: 'Checkout' });
}

function goToEntityPayment(): void {
  if (authStore.isAuthenticated) {
    router.push({ name: authStore.isAdmin ? 'AdminDashboard' : 'Dashboard' });
  } else {
    router.push({ name: 'Login' });
  }
}
</script>
