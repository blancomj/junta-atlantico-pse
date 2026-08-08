<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <img src="/junta-atlantico-logo.svg" alt="JA" class="h-7 w-7 brightness-0 invert" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Activar Cuenta</h1>
        <p class="text-sm text-gray-500 mt-2">Crea tu contrasena para acceder al sistema</p>
      </div>

      <!-- Invalid/expired token -->
      <div v-if="invalidToken" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <div class="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Enlace invalido o expirado</h2>
        <p class="text-sm text-gray-500 mb-4">El enlace de activacion no es valido o ya expiro.</p>
        <p class="text-sm text-gray-500">Solicita una nueva invitacion al administrador.</p>
      </div>

      <!-- Success -->
      <div v-else-if="success" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <div class="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Cuenta activada</h2>
        <p class="text-sm text-gray-500 mb-4">Tu contrasena ha sido configurada correctamente.</p>
        <router-link to="/login"
          class="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          Ir a Iniciar Sesion
        </router-link>
      </div>

      <!-- Form -->
      <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nueva contrasena</label>
            <input v-model="password" type="password" required minlength="8"
              placeholder="Minimo 8 caracteres"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar contrasena</label>
            <input v-model="confirmPassword" type="password" required minlength="8"
              placeholder="Repite tu contrasena"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>
          <button type="submit" :disabled="submitting"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {{ submitting ? 'Activando...' : 'Activar Cuenta' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const token = ref('');
const password = ref('');
const confirmPassword = ref('');
const submitting = ref(false);
const error = ref('');
const success = ref(false);
const invalidToken = ref(false);

onMounted(() => {
  token.value = (route.query.token as string) || '';
  if (!token.value) {
    invalidToken.value = true;
  }
});

async function handleSubmit() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Las contrasenas no coinciden';
    return;
  }

  if (password.value.length < 8) {
    error.value = 'La contrasena debe tener minimo 8 caracteres';
    return;
  }

  submitting.value = true;
  try {
    const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse').replace(/\/pse$/, '');
    const response = await fetch(`${BASE_URL}/auth/first-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value, newPassword: password.value })
    });

    const data = await response.json();

    if (data.success) {
      success.value = true;
    } else {
      error.value = data.message || 'Error al activar cuenta';
      if (data.message?.includes('invalido') || data.message?.includes('expirado')) {
        invalidToken.value = true;
      }
    }
  } catch (e) {
    error.value = 'Error de conexion';
  } finally {
    submitting.value = false;
  }
}
</script>
