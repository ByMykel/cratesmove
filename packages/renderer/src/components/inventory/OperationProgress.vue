<script setup lang="ts">
import { computed } from 'vue';
import { steamCancelOperation } from '@app/preload';
import type { OperationProgress } from '@/types/steam';
import { X } from 'lucide-vue-next';

const props = defineProps<{
  progress: OperationProgress | null;
  inProgress: boolean;
}>();

const percentage = computed(() => {
  if (!props.progress || props.progress.total === 0) return 0;
  return Math.round((props.progress.current / props.progress.total) * 100);
});

function cancel() {
  steamCancelOperation();
}
</script>

<template>
  <div
    v-if="inProgress && progress"
    class="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 shadow-lg"
  >
    <div class="mb-2 flex items-center justify-between">
      <p class="text-sm font-medium">Moving items... {{ progress.current }}/{{ progress.total }}</p>
      <UButton variant="ghost" color="neutral" size="xs" square @click="cancel">
        <X class="h-3.5 w-3.5" />
      </UButton>
    </div>
    <UProgress :model-value="percentage" />
    <p class="mt-1 text-xs text-(--ui-text-muted)">{{ percentage }}% complete</p>
  </div>
</template>
