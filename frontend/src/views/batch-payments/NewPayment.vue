<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <div class="max-w-4xl mx-auto px-4 py-8">
      <router-link to="/dashboard" class="text-blue-600 hover:underline mb-4 inline-block">&larr; Volver al listado</router-link>
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Nuevo Proceso de Pago</h1>

      <!-- Step 1: Upload -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">1. Subir archivo Excel</h2>
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
          @dragover.prevent @drop.prevent="handleDrop">
          <input type="file" ref="fileInput" accept=".xlsx,.xls" @change="handleFileSelect" class="hidden" />
          <p class="text-gray-500 mb-4">Arrastra el archivo aqui o</p>
          <button @click="(fileInput as HTMLInputElement | undefined)?.click()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Seleccionar archivo
          </button>
          <p class="text-xs text-gray-400 mt-2">Solo archivos .xlsx o .xls (max 5MB)</p>
        </div>
      </div>

      <!-- Validation Errors -->
      <div v-if="errors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
        <h3 class="text-red-800 font-semibold mb-2">Errores de validacion</h3>
        <ul class="max-h-60 overflow-y-auto space-y-1">
          <li v-for="(err, i) in errors" :key="i" class="text-sm text-red-700">
            <span v-if="err.row">Fila {{ err.row }}:</span>
            <strong>{{ err.field }}</strong> - {{ err.message }}
          </li>
        </ul>
      </div>

      <!-- Preview -->
      <div v-if="preview" class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">2. Vista previa</h2>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div><span class="text-gray-500">Archivo:</span> {{ preview.fileName }}</div>
          <div><span class="text-gray-500">Beneficiarios:</span> {{ preview.totalBeneficiarios }}</div>
          <div><span class="text-gray-500">Monto Total:</span> <strong>${{ formatCurrency(preview.montoTotal) }}</strong></div>
        </div>

        <DataTable
          :columns="previewColumns"
          :data="previewData"
          :page-size="10"
          :searchable="false"
          empty-text="No hay datos">
          <template #cell-VALOR="{ value }">
            <span class="font-medium">${{ formatCurrency(Number(value)) }}</span>
          </template>
        </DataTable>
        <p v-if="preview.totalBeneficiarios > 10" class="text-sm text-gray-500 mt-2">
          Mostrando primeros 10 de {{ preview.totalBeneficiarios }} registros
        </p>

        <div class="mt-4 flex gap-4">
          <button @click="handleCreate" :disabled="creating"
            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {{ creating ? 'Creando...' : 'Crear Proceso de Pago' }}
          </button>
          <button @click="reset" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </div>

      <!-- Success -->
      <div v-if="createdPayment" class="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 class="text-green-800 font-semibold mb-2">Proceso creado correctamente</h3>
        <p class="text-green-700 mb-4">El proceso quedo en estado "Por Pagar". Puedes pagarlo ahora o desde el listado.</p>
        <router-link :to="`/batch-payments/${createdPayment.id}`"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Ver detalle
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import batchPaymentService from '../../services/batch-payment.service';
import { UploadResult, ValidationError, BatchPayment } from '../../types/batch-payment.types';
import NavBar from '../../components/NavBar.vue';
import DataTable from '../../components/DataTable.vue';
import type { Column } from '../../components/DataTable.vue';

const previewColumns: Column[] = [
  { key: 'NUMERO_IDENTIFICACION', label: 'Identificacion' },
  { key: 'NOMBRE', label: 'Nombre' },
  { key: 'NUMERO_EXPEDIENTE', label: 'Expediente' },
  { key: 'VALOR', label: 'Valor', align: 'right' },
];

const fileInput = ref<HTMLInputElement>();
const preview = ref<UploadResult | null>(null);
const errors = ref<ValidationError[]>([]);
const creating = ref(false);
const createdPayment = ref<BatchPayment | null>(null);

function formatCurrency(v: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2 }).format(v);
}

const previewData = computed(() => preview.value?.preview || []);

async function processFile(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    errors.value = [{ row: null, field: 'ARCHIVO', message: 'El archivo excede 5MB' }];
    return;
  }

  try {
    preview.value = await batchPaymentService.uploadExcel(file);
    errors.value = [];
  } catch (e: any) {
    errors.value = e.response?.data?.errors || [{ row: null, field: 'ARCHIVO', message: 'Error al procesar' }];
    preview.value = null;
  }
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) processFile(file);
}

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (file) processFile(file);
}

async function handleCreate() {
  if (!preview.value) return;
  creating.value = true;
  try {
    createdPayment.value = await batchPaymentService.createPayment(preview.value.fileId);
    preview.value = null;
  } catch (e: any) {
    alert(e.response?.data?.message || 'Error al crear el proceso');
  } finally {
    creating.value = false;
  }
}

function reset() {
  preview.value = null;
  errors.value = [];
  createdPayment.value = null;
}
</script>
