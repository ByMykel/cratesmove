<script setup lang="ts">
import {Progress} from '@/components/ui/progress';
import {computed} from 'vue';
import type {OperationProgress} from '@/types/steam';

const props = defineProps<{
  progress: OperationProgress | null;
  inProgress: boolean;
}>();

const percentage = computed(() => {
  if (!props.progress) return 0;
  return Math.round((props.progress.current / props.progress.total) * 100);
});
</script>

<template>
  <div
    v-if="inProgress && progress"
    class="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-border bg-background p-4 shadow-lg"
  >
    <p class="mb-2 text-sm font-medium">
      Moving items... {{ progress.current }}/{{ progress.total }}
    </p>
    <Progress :model-value="percentage" />
    <p class="mt-1 text-xs text-muted-foreground">
      {{ percentage }}% complete
    </p>
  </div>
</template>
