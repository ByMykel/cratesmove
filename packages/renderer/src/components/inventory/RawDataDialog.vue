<script setup lang="ts">
import { computed } from 'vue';
import { useClipboard } from '@vueuse/core';
import { ref } from 'vue';

const props = defineProps<{
  open: boolean;
  itemName: string;
  rawData?: string;
}>();

const emits = defineEmits<{
  'update:open': [value: boolean];
}>();

const formatted = computed(() => {
  if (!props.rawData) return '';
  try {
    return JSON.stringify(JSON.parse(props.rawData), null, 2);
  } catch {
    return props.rawData;
  }
});

const { copy } = useClipboard();
const copied = ref(false);

async function handleCopy() {
  await copy(formatted.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>

<template>
  <UModal
    :open="open"
    title="Raw Item Data"
    :description="itemName"
    :ui="{ content: 'sm:max-w-2xl' }"
    @update:open="emits('update:open', $event)"
  >
    <template #body>
      <pre
        class="max-h-96 overflow-auto rounded-md bg-(--ui-bg-elevated) p-3 text-xs leading-relaxed"
        >{{ formatted }}</pre
      >
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="outline" color="neutral" @click="emits('update:open', false)">
          Close
        </UButton>
        <UButton @click="handleCopy">
          {{ copied ? 'Copied!' : 'Copy' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
