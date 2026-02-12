<script setup lang="ts">
import { Minus, Square, X } from 'lucide-vue-next';
import { windowMinimize, windowMaximize, windowClose } from '@app/preload';
</script>

<template>
  <div
    class="flex h-8 items-center justify-end border-b border-(--ui-border) bg-(--ui-bg)"
    style="-webkit-app-region: drag"
  >
    <div class="flex items-center" style="-webkit-app-region: no-drag">
      <button
        class="inline-flex h-8 w-10 items-center justify-center text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text)"
        @click="windowMinimize()"
      >
        <Minus class="h-4 w-4" />
      </button>
      <button
        class="inline-flex h-8 w-10 items-center justify-center text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text)"
        @click="windowMaximize()"
      >
        <Square class="h-3.5 w-3.5" />
      </button>
      <button
        class="inline-flex h-8 w-10 items-center justify-center text-(--ui-text-muted) hover:bg-red-500 hover:text-white"
        @click="windowClose()"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
