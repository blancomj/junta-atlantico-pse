<template>
  <div v-if="message" class="p-4 rounded-lg" :class="typeClasses">
    <p class="text-sm flex items-start">
      <span class="mr-2">{{ icon }}</span>
      <span>{{ message }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef } from 'vue';

const props = withDefaults(defineProps<{
  message?: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}>(), {
  message: '',
  type: 'error'
});

const typeClasses: ComputedRef<string> = computed(() => {
  const classes: Record<string, string> = {
    error: 'bg-red-50 border border-red-200 text-red-600',
    success: 'bg-green-50 border border-green-200 text-green-600',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-600',
    info: 'bg-blue-50 border border-blue-200 text-blue-600'
  };
  return classes[props.type] || classes.error;
});

const icon: ComputedRef<string> = computed(() => {
  const icons: Record<string, string> = {
    error: '\u274C',
    success: '\u2705',
    warning: '\u26A0\uFE0F',
    info: '\u2139\uFE0F'
  };
  return icons[props.type] || icons.error;
});
</script>
