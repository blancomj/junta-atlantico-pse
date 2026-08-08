<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <img src="/junta-atlantico-logo.svg" alt="Junta Atlantico" class="h-16 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900">Recuperar Contrasena</h1>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6">
        <div v-if="sent" class="text-center py-4">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">&#9993;</span>
          </div>
          <p class="text-gray-700">Si el correo existe en nuestro sistema, recibiras un link para recuperar tu contrasena.</p>
          <router-link to="/login" class="mt-4 inline-block text-blue-600 hover:underline">Volver al login</router-link>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Correo electronico</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="correo@entidad.com"
            />
          </div>

          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loading ? 'Enviando...' : 'Enviar link de recuperacion' }}
          </button>

          <div class="text-center">
            <router-link to="/login" class="text-sm text-gray-500 hover:underline">Volver al login</router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import authService from '../../services/auth.service';

const email = ref('');
const loading = ref(false);
const error = ref('');
const sent = ref(false);

async function handleSubmit() {
  loading.value = true;
  error.value = '';
  try {
    await authService.forgotPassword(email.value);
    sent.value = true;
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error al enviar el correo';
  } finally {
    loading.value = false;
  }
}
</script>
