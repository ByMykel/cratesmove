<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import { useSteam } from '@/composables/useSteam';
import { Loader2 } from 'lucide-vue-next';

const { switchingAccount } = useSteam();
</script>

<template>
  <div class="flex h-full flex-col bg-background">
    <AppHeader />
    <div class="relative flex flex-1 overflow-hidden">
      <slot />

      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="switchingAccount"
          class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-(--ui-bg)/80 backdrop-blur-sm"
        >
          <Loader2 class="h-8 w-8 animate-spin text-(--ui-primary)" />
          <p class="text-sm font-medium text-(--ui-text-muted)">Switching account...</p>
        </div>
      </Transition>
    </div>
  </div>
</template>
