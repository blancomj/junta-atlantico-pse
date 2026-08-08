<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <div class="max-w-2xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>

      <!-- Profile Data Section -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Datos de la entidad</h2>
        <form @submit.prevent="handleUpdateProfile" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input :value="user?.name" type="text" disabled
              class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input :value="user?.email" type="email" disabled
              class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">NIT <span class="text-red-500">*</span></label>
            <input v-model="profileData.nit" type="text" required placeholder="Ej: 900123456-7"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Direccion <span class="text-red-500">*</span></label>
            <input v-model="profileData.direccion" type="text" required placeholder="Direccion de la entidad"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefono <span class="text-red-500">*</span></label>
            <input v-model="profileData.telefono" type="tel" required placeholder="Ej: 3001234567" maxlength="10"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>

          <div v-if="profileSuccess" class="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-sm text-green-700">{{ profileSuccess }}</p>
          </div>
          <div v-if="profileError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ profileError }}</p>
          </div>

          <button type="submit" :disabled="profileLoading"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {{ profileLoading ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </form>
      </div>

      <!-- Change Password Section -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Cambiar contrasena</h2>
        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contrasena actual <span class="text-red-500">*</span></label>
            <input v-model="passwordData.currentPassword" type="password" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nueva contrasena <span class="text-red-500">*</span></label>
            <input v-model="passwordData.newPassword" type="password" required minlength="8"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contrasena <span class="text-red-500">*</span></label>
            <input v-model="passwordData.confirmPassword" type="password" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>

          <div v-if="passwordSuccess" class="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-sm text-green-700">{{ passwordSuccess }}</p>
          </div>
          <div v-if="passwordError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ passwordError }}</p>
          </div>

          <button type="submit" :disabled="passwordLoading"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {{ passwordLoading ? 'Actualizando...' : 'Actualizar contrasena' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import NavBar from '../../components/NavBar.vue';
import authService from '../../services/auth.service';
import { AuthUser } from '../../types/batch-payment.types';

const user = ref<AuthUser | null>(null);

// Profile data
const profileData = ref({ nit: '', direccion: '', telefono: '' });
const profileLoading = ref(false);
const profileError = ref('');
const profileSuccess = ref('');

// Password data
const passwordData = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });
const passwordLoading = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');

onMounted(() => {
  user.value = authService.getUser();
  if (user.value) {
    profileData.value = {
      nit: user.value.nit || '',
      direccion: user.value.direccion || '',
      telefono: user.value.telefono || ''
    };
  }
});

async function handleUpdateProfile() {
  profileLoading.value = true;
  profileError.value = '';
  profileSuccess.value = '';
  try {
    const updated = await authService.updateProfile(
      profileData.value.nit,
      profileData.value.direccion,
      profileData.value.telefono
    );
    user.value = updated;
    profileSuccess.value = 'Perfil actualizado correctamente';
  } catch (e: any) {
    profileError.value = e.response?.data?.message || 'Error al actualizar perfil';
  } finally {
    profileLoading.value = false;
  }
}

async function handleChangePassword() {
  if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    passwordError.value = 'Las contrasenas no coinciden';
    return;
  }
  passwordLoading.value = true;
  passwordError.value = '';
  passwordSuccess.value = '';
  try {
    await authService.changePassword(passwordData.value.currentPassword, passwordData.value.newPassword);
    passwordSuccess.value = 'Contrasena actualizada correctamente';
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
  } catch (e: any) {
    passwordError.value = e.response?.data?.message || 'Error al cambiar contrasena';
  } finally {
    passwordLoading.value = false;
  }
}
</script>
