<template>
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <!-- Header: search + summary -->
    <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <div v-if="searchable" class="relative">
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input v-model="search" type="text" :placeholder="searchPlaceholder"
            class="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64" />
        </div>
        <slot name="toolbar" />
      </div>
      <span class="text-sm text-gray-400 whitespace-nowrap">
        {{ filteredData.length }} registro{{ filteredData.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th v-for="col in columns" :key="col.key"
              class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              :class="[col.align === 'right' ? 'text-right' : '', col.align === 'center' ? 'text-center' : '', col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-700' : '']"
              @click="col.sortable !== false && toggleSort(col.key)">
              <div class="flex items-center gap-1" :class="[col.align === 'right' ? 'justify-end' : '', col.align === 'center' ? 'justify-center' : '']">
                {{ col.label }}
                <template v-if="col.sortable !== false">
                  <svg v-if="sortKey === col.key && sortOrder === 'asc'" class="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else-if="sortKey === col.key && sortOrder === 'desc'" class="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="h-3 w-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-7 9a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L4 12.414 1.707 14.707a1 1 0 01-1.414-1.414l3-3A1 1 0 014 12z" clip-rule="evenodd" />
                  </svg>
                </template>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="paginatedData.length === 0">
            <td :colspan="columns.length" class="px-4 py-12 text-center text-gray-400">
              {{ emptyText }}
            </td>
          </tr>
          <tr v-for="(row, i) in paginatedData" :key="rowKey ? row[rowKey] : i"
            class="hover:bg-blue-50/30 transition-colors"
            :class="[clickable ? 'cursor-pointer' : '']"
            @click="clickable && $emit('row-click', row)">
            <td v-for="col in columns" :key="col.key"
              class="px-4 py-2.5"
              :class="[col.align === 'right' ? 'text-right' : '', col.align === 'center' ? 'text-center' : '', col.class || '']">
              <slot :name="'cell-' + col.key" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="hasFooter" class="bg-gray-50 border-t border-gray-200">
          <tr>
            <td v-for="col in columns" :key="col.key"
              class="px-4 py-2.5 text-sm font-semibold"
              :class="[col.align === 'right' ? 'text-right' : '', col.align === 'center' ? 'text-center' : '']">
              <slot :name="'footer-' + col.key" :value="col.key">
              </slot>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
      <span class="text-sm text-gray-400">
        Pagina {{ page }} de {{ totalPages }}
      </span>
      <div class="flex items-center gap-1">
        <button @click="page = 1" :disabled="page <= 1"
          class="px-2 py-1 text-sm rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
          &laquo;
        </button>
        <button @click="page--" :disabled="page <= 1"
          class="px-2 py-1 text-sm rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
          &lsaquo;
        </button>
        <button v-for="p in visiblePages" :key="p" @click="page = p"
          class="px-2.5 py-1 text-sm rounded border transition-colors"
          :class="p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'">
          {{ p }}
        </button>
        <button @click="page++" :disabled="page >= totalPages"
          class="px-2 py-1 text-sm rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
          &rsaquo;
        </button>
        <button @click="page = totalPages" :disabled="page >= totalPages"
          class="px-2 py-1 text-sm rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
          &raquo;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useSlots } from 'vue';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<{
  columns: Column[];
  data: any[];
  rowKey?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  pageSize?: number;
  clickable?: boolean;
}>(), {
  searchable: true,
  searchPlaceholder: 'Buscar...',
  emptyText: 'No se encontraron registros',
  pageSize: 10,
  clickable: false,
});

const slots = useSlots();
const hasFooter = computed(() => {
  return props.columns.some(col => slots[`footer-${col.key}`]);
});

defineEmits<{
  'row-click': [row: any];
}>();

const search = ref('');
const sortKey = ref('');
const sortOrder = ref<'asc' | 'desc'>('asc');
const page = ref(1);

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
}

const filteredData = computed(() => {
  let result = [...props.data];
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(q))
    );
  }
  if (sortKey.value) {
    result.sort((a, b) => {
      const va = a[sortKey.value] ?? '';
      const vb = b[sortKey.value] ?? '';
      const cmp = String(va).localeCompare(String(vb), 'es', { numeric: true });
      return sortOrder.value === 'asc' ? cmp : -cmp;
    });
  }
  return result;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / props.pageSize)));

watch(filteredData, () => { page.value = 1; });

const paginatedData = computed(() => {
  const start = (page.value - 1) * props.pageSize;
  return filteredData.value.slice(start, start + props.pageSize);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = page.value;
  const pages: number[] = [];
  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});
</script>
