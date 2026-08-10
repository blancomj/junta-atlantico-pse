<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-5 sm:gap-8 mb-4">
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
        <h1 class="text-lg font-bold text-gray-900">Pago PSE - Entidades</h1>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Correo electronico</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="correo@entidad.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
            <input
              v-model="password"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tu contrasena"
            />
          </div>

          <div v-if="authStore.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ authStore.error }}</p>
          </div>

          <button
            type="submit"
            :disabled="authStore.loading"
            class="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {{ authStore.loading ? 'Ingresando...' : 'Iniciar Sesion' }}
          </button>

          <div class="text-center">
            <router-link to="/forgot-password" class="text-sm text-blue-600 hover:underline">
              Olvidaste tu contrasena?
            </router-link>
          </div>
        </form>
      </div>

      <div class="text-center mt-6">
        <router-link to="/" class="text-sm text-gray-500 hover:text-blue-600 transition-colors">
          &larr; Volver al inicio
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');

async function handleLogin() {
  try {
    await authStore.login(email.value, password.value);
    if (authStore.mustChangePassword) {
      router.push({ name: 'ChangePassword' });
    } else if (authStore.isAdmin) {
      router.push({ name: 'AdminDashboard' });
    } else {
      router.push({ name: 'Dashboard' });
    }
  } catch {
    // Error is handled by the store
  }
}
</script>
