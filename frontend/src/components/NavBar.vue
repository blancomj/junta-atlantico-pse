<template>
  <nav class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-14">
        <div class="flex items-center">
          <router-link to="/" class="flex items-center space-x-2 mr-6 group">
            <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <img src="/junta-atlantico-logo.svg" alt="JA" class="h-5 w-5 brightness-0 invert" />
            </div>
            <span class="text-sm font-bold text-gray-800 tracking-tight hidden sm:inline group-hover:text-blue-600 transition-colors">
              Junta Atlantico
            </span>
          </router-link>

          <div class="flex items-center space-x-1 border-l border-gray-200 pl-4">
            <template v-if="authStore.isAdmin">
              <router-link v-for="link in adminLinks" :key="link.to" :to="link.to"
                class="nav-link" :class="active(link.route)">
                {{ link.label }}
              </router-link>
            </template>
            <template v-else>
              <router-link v-for="link in userLinks" :key="link.to" :to="link.to"
                class="nav-link" :class="active(link.route)">
                {{ link.label }}
              </router-link>
            </template>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <div class="text-right hidden sm:block">
            <p class="text-xs text-gray-400 leading-none">{{ authStore.user?.entityName || '' }}</p>
            <p class="text-sm text-gray-700 font-medium">{{ authStore.user?.name || authStore.user?.email }}</p>
          </div>
          <div class="w-px h-6 bg-gray-200"></div>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide"
            :class="authStore.isAdmin ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'">
            {{ authStore.isAdmin ? 'Admin' : 'Usuario' }}
          </span>
          <router-link to="/profile"
            class="text-sm text-gray-500 hover:text-blue-600 transition-colors" title="Mi perfil">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </router-link>
          <button @click="handleLogout"
            class="text-sm text-gray-400 hover:text-red-600 transition-colors ml-1" title="Cerrar sesion">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const adminLinks = [
  { to: '/admin', label: 'Consulta Procesos', route: 'AdminDashboard' },
  { to: '/admin/users', label: 'Usuarios', route: 'UserManagement' },
];

const userLinks = [
  { to: '/dashboard', label: 'Mis Procesos', route: 'Dashboard' },
  { to: '/batch-payments/new', label: 'Nuevo Pago', route: 'NewPayment' },
];

function active(name: string): string {
  return route.name === name ? 'nav-active' : '';
}

function handleLogout() {
  authStore.logout();
  router.push({ name: 'Login' });
}
</script>

<style scoped>
.nav-link {
  @apply px-3 py-1.5 text-sm text-gray-500 rounded hover:bg-gray-50 hover:text-gray-900 transition-all font-medium;
}
.nav-active {
  @apply bg-blue-50 text-blue-700 font-semibold;
}
</style>
