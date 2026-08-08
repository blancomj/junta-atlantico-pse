<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <img src="/junta-atlantico-logo.svg" alt="Junta Atlantico" class="h-16 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900">Restablecer Contrasena</h1>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6">
        <div v-if="success" class="text-center py-4">
          <p class="text-gray-700">Contrasena actualizada correctamente.</p>
          <router-link to="/login" class="mt-4 inline-block text-blue-600 hover:underline">Ir al login</router-link>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nueva contrasena</label>
            <input v-model="newPassword" type="password" required minlength="8"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar contrasena</label>
            <input v-model="confirmPassword" type="password" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>

          <button type="submit" :disabled="loading"
            class="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {{ loading ? 'Actualizando...' : 'Actualizar contrasena' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import authService from '../../services/auth.service';

const route = useRoute();
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);

async function handleSubmit() {
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Las contrasenas no coinciden';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const token = route.query.token as string;
    await authService.resetPassword(token, newPassword.value);
    success.value = true;
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error al actualizar';
  } finally {
    loading.value = false;
  }
}
</script>
