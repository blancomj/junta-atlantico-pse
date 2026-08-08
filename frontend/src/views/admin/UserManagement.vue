<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Gestion de Usuarios</h1>
        <button @click="showCreateModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nuevo Usuario
        </button>
      </div>

      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div v-else class="bg-white rounded-lg shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Invitacion</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="u in users" :key="u.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ u.full_name }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ u.email }}</td>
              <td class="px-4 py-3">
                <span :class="u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'"
                  class="px-2 py-0.5 text-xs font-medium rounded-full">
                  {{ u.role === 'admin' ? 'Administrador' : 'Usuario' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span v-if="u.status === 'pending'" class="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Pendiente
                </span>
                <span v-else-if="u.is_active" class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                  Activo
                </span>
                <span v-else class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                  Inactivo
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <button v-if="u.status === 'pending'" @click="sendInvitation(u)"
                  class="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Enviar Activacion
                </button>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button @click="openEdit(u)" class="text-xs text-gray-500 hover:text-gray-700">
                    Editar
                  </button>
                  <button @click="toggleActive(u)" class="text-xs"
                    :class="u.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'">
                    {{ u.is_active ? 'Desactivar' : 'Activar' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="users.length === 0" class="px-6 py-4 text-gray-500 text-sm">No hay usuarios registrados.</p>
      </div>

      <!-- Create Modal -->
      <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-bold mb-4">Nuevo Usuario</h3>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input v-model="newUser.fullName" type="text" required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input v-model="newUser.email" type="email" required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select v-model="newUser.role"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div v-if="createError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-600">{{ createError }}</p>
            </div>
            <div v-if="createdLink" class="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p class="text-sm text-green-700 font-medium mb-2">Usuario creado. Enlace de invitacion:</p>
              <p class="text-xs text-green-600 break-all bg-green-100 p-2 rounded">{{ createdLink }}</p>
              <button type="button" @click="copyLink(createdLink)" class="mt-2 text-xs text-blue-600 hover:underline">
                Copiar enlace
              </button>
            </div>
            <div class="flex gap-4 justify-end">
              <button type="button" @click="closeCreateModal"
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                {{ createdLink ? 'Cerrar' : 'Cancelar' }}
              </button>
              <button v-if="!createdLink" type="submit" :disabled="creating"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {{ creating ? 'Creando...' : 'Crear' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Modal -->
      <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-bold mb-4">Editar Usuario</h3>
          <form @submit.prevent="handleEdit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input v-model="editUser.fullName" type="text" required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input :value="editUser.email" type="email" disabled
                class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select v-model="editUser.role"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <input v-model="editUser.isActive" type="checkbox" id="edit-active"
                class="h-4 w-4 text-blue-600 rounded" />
              <label for="edit-active" class="text-sm text-gray-700">Activo</label>
            </div>
            <div v-if="editError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-600">{{ editError }}</p>
            </div>
            <div class="flex gap-4 justify-end">
              <button type="button" @click="showEditModal = false"
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
              <button type="submit" :disabled="editing"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {{ editing ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import NavBar from '../../components/NavBar.vue';
import authService from '../../services/auth.service';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse').replace(/\/pse$/, '');

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  status: string;
}

const users = ref<User[]>([]);
const loading = ref(true);

// Create
const showCreateModal = ref(false);
const creating = ref(false);
const createError = ref('');
const createdLink = ref('');
const newUser = ref({ fullName: '', email: '', role: 'user' });

// Edit
const showEditModal = ref(false);
const editing = ref(false);
const editError = ref('');
const editUser = ref({ id: '', fullName: '', email: '', role: 'user', isActive: true });

function authHeaders() {
  return { Authorization: `Bearer ${authService.getToken()}` };
}

async function loadUsers() {
  loading.value = true;
  try {
    const response = await axios.get(`${BASE_URL}/admin/users`, { headers: authHeaders() });
    users.value = response.data.data;
  } catch (e: any) {
    console.error('Error loading users', e);
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  creating.value = true;
  createError.value = '';
  createdLink.value = '';
  try {
    const response = await axios.post(`${BASE_URL}/admin/users`, newUser.value, { headers: authHeaders() });
    createdLink.value = response.data.data.invitationLink;
    await loadUsers();
  } catch (e: any) {
    createError.value = e.response?.data?.message || 'Error al crear usuario';
  } finally {
    creating.value = false;
  }
}

function closeCreateModal() {
  showCreateModal.value = false;
  newUser.value = { fullName: '', email: '', role: 'user' };
  createError.value = '';
  createdLink.value = '';
}

function openEdit(u: User) {
  editUser.value = {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    isActive: !!u.is_active
  };
  editError.value = '';
  showEditModal.value = true;
}

async function handleEdit() {
  editing.value = true;
  editError.value = '';
  try {
    await axios.patch(`${BASE_URL}/admin/users/${editUser.value.id}`, {
      fullName: editUser.value.fullName,
      role: editUser.value.role,
      is_active: editUser.value.isActive
    }, { headers: authHeaders() });
    showEditModal.value = false;
    await loadUsers();
  } catch (e: any) {
    editError.value = e.response?.data?.message || 'Error al actualizar usuario';
  } finally {
    editing.value = false;
  }
}

async function toggleActive(u: User) {
  try {
    await axios.patch(`${BASE_URL}/admin/users/${u.id}/toggle-active`, {}, { headers: authHeaders() });
    u.is_active = !u.is_active;
  } catch (e: any) {
    alert(e.response?.data?.message || 'Error al cambiar estado');
  }
}

async function sendInvitation(u: User) {
  try {
    const response = await axios.post(`${BASE_URL}/admin/users/${u.id}/invite`, {}, { headers: authHeaders() });
    const data = response.data;
    const link = data.invitationLink;

    if (data.emailSent) {
      alert(`Correo enviado a ${u.email}`);
    } else {
      // Email failed, show the link to copy manually
      if (confirm(`No se pudo enviar el correo a ${u.email}.\n\nEnlace de invitacion:\n${link}\n\nCopiar al portapapeles?`)) {
        copyLink(link);
      }
    }
  } catch (e: any) {
    alert(e.response?.data?.message || 'Error al enviar invitacion');
  }
}

function copyLink(link: string) {
  navigator.clipboard.writeText(link).then(() => {
    alert('Enlace copiado al portapapeles');
  });
}

onMounted(loadUsers);
</script>
