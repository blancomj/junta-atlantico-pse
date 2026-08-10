<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <div class="max-w-7xl mx-auto px-4 py-8">

      <!-- Filtros -->
      <div class="bg-blue-50 rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select v-model="filters.tipo" class="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Todos</option>
              <option value="individual">Individual</option>
              <option value="lote">Lote</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select v-model="filters.estado" class="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Todos</option>
              <option value="por_pagar">Por Pagar</option>
              <option value="pagado">Pagado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Entidad</label>
            <select v-model="filters.userId" class="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Todas</option>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.full_name || u.email }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
            <input v-model="filters.fechaDesde" type="date" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
            <input v-model="filters.fechaHasta" type="date" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div class="flex items-end">
            <button @click="loadData" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Filtrar
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <!-- DataTable -->
      <DataTable v-else :columns="columns" :data="payments" row-key="id" :searchable="false"
        :page-size="15">
        <template #toolbar>
          <div class="flex items-center gap-2">
            <div class="relative">
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input v-model="beneficiarySearch" @keyup.enter="searchBeneficiary" type="text"
                placeholder="Paciente, identificacion o expediente..."
                class="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-72" />
              <button v-if="beneficiarySearch" @click="clearBeneficiarySearch"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button @click="searchBeneficiary"
              class="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 font-medium">
              Buscar
            </button>
          </div>
        </template>
        <template #cell-num="slotProps">
          {{ getRowIndex((slotProps as any).row) }}
        </template>
        <template #cell-user_name="slotProps">
          {{ entidadLabel((slotProps as any).row) }}
        </template>
        <template #cell-estado="{ value }">
          <span :class="statusClass(value)" class="px-2 py-1 text-xs rounded-full whitespace-nowrap">
            {{ statusLabel(value) }}
          </span>
        </template>
        <template #cell-monto_total="slotProps">
          <span class="font-medium" :class="{ 'text-gray-400': (slotProps as any).row.estado === 'anulado' }">
            <template v-if="(slotProps as any).row.estado === 'anulado'">(${{ formatCurrency(Number((slotProps as any).value)) }})</template>
            <template v-else>${{ formatCurrency(Number((slotProps as any).value)) }}</template>
          </span>
        </template>
        <template #cell-banco_pago="{ value }">
          {{ value || '—' }}
        </template>
        <template #cell-documento_pago="{ value }">
          {{ value || '—' }}
        </template>
        <template #cell-fecha_pago="slotProps">
          {{ (slotProps as any).row.fecha_pago ? formatDate((slotProps as any).row.fecha_pago) : formatDate((slotProps as any).row.created_at) }}
        </template>
        <template #cell-id="slotProps">
          <router-link :to="`/batch-payments/${(slotProps as any).row.id}`"
            class="text-blue-600 hover:underline text-sm">Ver</router-link>
        </template>

        <template #footer-num>TOTAL</template>
        <template #footer-total_beneficiarios>{{ sumBeneficiarios }}</template>
        <template #footer-monto_total>${{ formatCurrency(Number(sumMonto)) }}</template>
      </DataTable>

      <!-- Exportar debajo de la tabla -->
      <div class="mt-4 flex items-center gap-4">
        <button @click="exportExcel" :disabled="payments.length === 0 || exporting"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
          {{ exporting ? 'Generando...' : 'Exportar a Excel' }}
        </button>
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" v-model="exportDetallado" class="h-4 w-4 text-blue-600 rounded" />
          Detallado
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AdminDashboard' });

import { ref, computed, onMounted } from 'vue';
import * as XLSX from 'xlsx';
import NavBar from '../../components/NavBar.vue';
import DataTable, { type Column } from '../../components/DataTable.vue';
import batchPaymentService from '../../services/batch-payment.service';
import authService from '../../services/auth.service';
import { BatchPayment, BatchPaymentBeneficiary } from '../../types/batch-payment.types';

interface UserOption { id: string; full_name: string; email: string; }

const columns: Column[] = [
  { key: 'num', label: '#', align: 'center', sortable: false, class: 'w-10' },
  { key: 'file_name', label: 'Archivo' },
  { key: 'estado', label: 'Estado', class: 'whitespace-nowrap' },
  { key: 'user_name', label: 'Entidad' },
  { key: 'total_beneficiarios', label: 'Cant.', align: 'right', class: 'w-16' },
  { key: 'monto_total', label: 'Monto', align: 'right' },
  { key: 'banco_pago', label: 'Banco' },
  { key: 'documento_pago', label: 'No. Transferencia' },
  { key: 'fecha_pago', label: 'Fecha' },
  { key: 'id', label: 'Accion', align: 'center', sortable: false },
];

const payments = ref<BatchPayment[]>([]);
const users = ref<UserOption[]>([]);
const loading = ref(false);
const exporting = ref(false);
const exportDetallado = ref(false);
const beneficiarySearch = ref('');

const filters = ref({
  estado: '',
  tipo: '',
  userId: '',
  fechaDesde: '',
  fechaHasta: ''
});

function entidadLabel(row: BatchPayment): string {
  return row.tipo === 'individual' ? (row.beneficiary_documento || '—') : (row.user_name || '');
}

// Los procesos anulados no suman ni cuentan en los totales
const sumMonto = computed(() => payments.value
  .filter(p => p.estado !== 'anulado')
  .reduce((s, p) => s + Number(p.monto_total || 0), 0));
const sumBeneficiarios = computed(() => payments.value
  .filter(p => p.estado !== 'anulado')
  .reduce((s, p) => s + Number(p.total_beneficiarios || 0), 0));

const selectedEntityName = computed(() => {
  if (!filters.value.userId) return '';
  const u = users.value.find(u => u.id === filters.value.userId);
  return u ? u.full_name.replace(/\s+/g, '_') : '';
});

function getRowIndex(row: BatchPayment): number {
  return payments.value.findIndex(p => p.id === row.id) + 1;
}

function statusClass(estado: string) {
  const c: Record<string, string> = {
    por_pagar: 'bg-yellow-100 text-yellow-800',
    pagado: 'bg-green-100 text-green-800',
    anulado: 'bg-red-100 text-red-800'
  };
  return c[estado] || 'bg-gray-100';
}

function statusLabel(estado: string) {
  return ({ por_pagar: 'Por Pagar', pagado: 'Pagado', anulado: 'Anulado' } as Record<string, string>)[estado] || estado;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO');
}

async function loadData() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: 1, pageSize: 10000 };
    if (filters.value.estado) params.estado = filters.value.estado;
    if (filters.value.tipo) params.tipo = filters.value.tipo;
    if (filters.value.userId) params.userId = filters.value.userId;
    if (filters.value.fechaDesde) params.fechaDesde = filters.value.fechaDesde;
    if (filters.value.fechaHasta) params.fechaHasta = filters.value.fechaHasta;

    const result = await batchPaymentService.list(params);
    payments.value = result.data;
  } catch (e) {
    console.error('Error loading processes', e);
  } finally {
    loading.value = false;
  }
}

async function fetchBeneficiaries(paymentId: string): Promise<BatchPaymentBeneficiary[]> {
  const token = authService.getToken();
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse').replace(/\/pse$/, '');
  try {
    const res = await fetch(`${baseUrl}/batch-payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.beneficiaries || [];
  } catch {
    return [];
  }
}

function getExportPrefix(): string {
  const entity = selectedEntityName.value;
  const date = new Date().toISOString().slice(0, 10);
  return entity ? `${entity}_${date}` : `procesos_${date}`;
}

async function exportExcel() {
  exporting.value = true;
  try {
    const wb = XLSX.utils.book_new();
    const prefix = getExportPrefix();

    if (exportDetallado.value) {
      const rows: (string | number)[][] = [];
      rows.push([
        '#', 'Archivo', 'Estado', 'Entidad', 'Beneficiarios', 'Monto Total',
        'Banco', 'No. Transferencia', 'Fecha Pago', 'Fecha Creacion',
        'No. Identificacion', 'Nombre', 'No. Expediente', 'Valor', 'Estado Beneficiario'
      ]);

      let rowNum = 0;
      for (const p of payments.value) {
        rowNum++;
        const beneficiaries = await fetchBeneficiaries(p.id);
        const estadoLabel = statusLabel(p.estado);
        const fechaPago = p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-CO') : '';
        const fechaCreacion = new Date(p.created_at).toLocaleDateString('es-CO');

        if (beneficiaries.length === 0) {
          rows.push([
            rowNum, p.file_name, estadoLabel, entidadLabel(p), p.total_beneficiarios, p.monto_total,
            p.banco_pago || '', p.documento_pago || '', fechaPago, fechaCreacion,
            '', '', '', '', ''
          ]);
        } else {
          for (const b of beneficiaries) {
            rows.push([
              rowNum, p.file_name, estadoLabel, entidadLabel(p), p.total_beneficiarios, p.monto_total,
              p.banco_pago || '', p.documento_pago || '', fechaPago, fechaCreacion,
              b.numero_identificacion, b.nombre, b.numero_expediente || '', b.valor,
              b.estado === 'pagado' ? 'Pagado' : 'Pendiente'
            ]);
          }
        }
      }

      rows.push(['', '', '', 'TOTAL', sumBeneficiarios.value, sumMonto.value, '', '', '', '', '', '', '', '', '']);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 18 },
        { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
        { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
      XLSX.writeFile(wb, `${prefix}_detallado.xlsx`);
    } else {
      const rows: (string | number)[][] = [];
      rows.push(['#', 'Archivo', 'Estado', 'Entidad', 'Beneficiarios', 'Monto', 'Banco', 'No. Transferencia', 'Fecha Pago', 'Fecha Creacion']);

      payments.value.forEach((p, i) => {
        rows.push([
          i + 1,
          p.file_name,
          statusLabel(p.estado),
          entidadLabel(p),
          p.total_beneficiarios,
          p.monto_total,
          p.banco_pago || '',
          p.documento_pago || '',
          p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-CO') : '',
          new Date(p.created_at).toLocaleDateString('es-CO')
        ]);
      });

      rows.push(['', '', '', 'TOTAL', sumBeneficiarios.value, sumMonto.value, '', '', '', '']);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 18 },
        { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Procesos');
      XLSX.writeFile(wb, `${prefix}.xlsx`);
    }
  } catch (e) {
    console.error('Error exporting Excel', e);
    alert('Error al generar el archivo Excel');
  } finally {
    exporting.value = false;
  }
}

async function searchBeneficiary() {
  if (!beneficiarySearch.value || beneficiarySearch.value.trim().length < 2) {
    loadData();
    return;
  }

  loading.value = true;
  try {
    const token = authService.getToken();
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse').replace(/\/pse$/, '');
    const res = await fetch(`${baseUrl}/batch-payments/search-beneficiary?q=${encodeURIComponent(beneficiarySearch.value)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error en la busqueda');
    const json = await res.json();
    payments.value = json.data || [];
  } catch (e) {
    console.error('Error searching beneficiary', e);
    payments.value = [];
  } finally {
    loading.value = false;
  }
}

function clearBeneficiarySearch() {
  beneficiarySearch.value = '';
  loadData();
}

onMounted(async () => {
  const [usersRes] = await Promise.all([
    fetch(`${import.meta.env.VITE_API_URL?.replace(/\/pse$/, '')}/admin/users?role=user`, {
      headers: { Authorization: `Bearer ${authService.getToken()}` }
    }).then(r => r.json()).catch(() => []),
    loadData()
  ]);
  users.value = usersRes?.data || [];
});
</script>
