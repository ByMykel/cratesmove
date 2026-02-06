<script setup lang="ts">
import {type HTMLAttributes} from 'vue';
import {
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from 'radix-vue';
import {cn} from '@/lib/utils';
import {X} from 'lucide-vue-next';

const props = defineProps<DialogContentProps & {class?: HTMLAttributes['class']}>();
const emits = defineEmits<DialogContentEmits>();
</script>

<template>
  <DialogPortal>
    <DialogOverlay class="fixed inset-0 z-50 bg-black/80" />
    <DialogContent
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg sm:rounded-lg',
          props.class,
        )
      "
      v-bind="props"
      @escape-key-down="emits('escapeKeyDown', $event)"
      @pointer-down-outside="emits('pointerDownOutside', $event)"
      @focus-outside="emits('focusOutside', $event)"
      @interact-outside="emits('interactOutside', $event)"
      @open-auto-focus="emits('openAutoFocus', $event)"
      @close-auto-focus="emits('closeAutoFocus', $event)"
    >
      <slot />

      <DialogClose
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X class="h-4 w-4" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
