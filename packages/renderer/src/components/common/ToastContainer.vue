<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { X } from 'lucide-vue-next';

const { toasts, remove } = useToast();
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'flex items-center gap-2 rounded-md border px-4 py-3 text-sm shadow-lg max-w-sm',
          toast.type === 'error' && 'border-red-500/20 bg-red-500/10 text-(--ui-text)',
          toast.type === 'success' && 'border-green-500/20 bg-green-500/10 text-(--ui-text)',
          toast.type === 'info' && 'border-(--ui-border) bg-(--ui-bg-elevated) text-(--ui-text)',
        ]"
      >
        <span class="flex-1">{{ toast.message }}</span>
        <button
          class="shrink-0 rounded p-0.5 opacity-50 hover:opacity-100"
          @click="remove(toast.id)"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
