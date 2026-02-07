<script setup lang="ts">
import type {StorageUnit} from '@/types/steam';
import {Archive} from 'lucide-vue-next';

defineProps<{
  unit: StorageUnit;
}>();

defineEmits<{
  click: [];
}>();
</script>

<template>
  <div
    class="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-(--ui-bg-elevated)"
    @click="$emit('click')"
  >
    <Archive class="h-4 w-4 shrink-0 text-(--ui-text-muted)" />
    <div class="flex-1 truncate">
      <p class="truncate text-sm font-medium">{{ unit.custom_name || unit.name }}</p>
    </div>
    <UBadge variant="subtle" color="neutral"> {{ unit.item_count }}/1000 </UBadge>
  </div>
</template>
