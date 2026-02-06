<script setup lang="ts">
import AppHeader from './AppHeader.vue';
</script>

<template>
  <div class="flex h-screen flex-col bg-background">
    <AppHeader />
    <div class="flex flex-1 overflow-hidden">
      <slot />
    </div>
  </div>
</template>
