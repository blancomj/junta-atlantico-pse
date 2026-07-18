<template>
  <div v-if="causeRejection" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <span class="text-2xl">&#9888;&#65039;</span>
      </div>
      <div class="ml-3 flex-1">
        <h4 class="text-sm font-semibold text-red-800">Por que fue rechazada?</h4>
        <p class="text-sm text-red-700 mt-1">
          <strong>Causal {{ causeRejection }}:</strong> {{ friendlyCausal }}
        </p>
        <p v-if="rejectionDescription" class="text-xs text-red-600 mt-2">
          {{ rejectionDescription }}
        </p>
        <p v-if="stateDescription" class="text-xs text-red-600 mt-1">
          Estado: {{ stateDescription }}
        </p>
        <div class="mt-3 flex gap-2">
          <button
            @click="$emit('retry')"
            class="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Intentar de nuevo
          </button>
          <a
            href="mailto:facturacion@juntaatlantico.co"
            class="text-xs px-3 py-1 border border-red-300 text-red-700 rounded hover:bg-red-100"
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { getCausalMessage } from '../utils/causalRejection';

const props = withDefaults(defineProps<{
  causeRejection?: string | null;
  rejectionDescription?: string | null;
  stateDescription?: string | null;
}>(), {
  causeRejection: null,
  rejectionDescription: null,
  stateDescription: null
});

defineEmits<{
  (e: 'retry'): void;
}>();

const friendlyCausal: ComputedRef<string> = computed(() =>
  props.causeRejection ? getCausalMessage(props.causeRejection) : ''
);
</script>
