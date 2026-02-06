<script setup lang="ts">
import type {StorageUnit} from '@/types/steam';
import {Badge} from '@/components/ui/badge';
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
    class="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-secondary"
    @click="$emit('click')"
  >
    <Archive class="h-4 w-4 shrink-0 text-muted-foreground" />
    <div class="flex-1 truncate">
      <p class="truncate text-sm font-medium">{{ unit.custom_name || unit.name }}</p>
    </div>
    <Badge variant="secondary" class="shrink-0">
      {{ unit.item_count }}/1000
    </Badge>
  </div>
</template>
