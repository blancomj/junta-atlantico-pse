<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <router-view v-slot="{ Component }">
      <keep-alive :include="['Dashboard']">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
</script>
