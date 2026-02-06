<script setup lang="ts">
import {Button} from '@/components/ui/button';
import type {StorageUnit} from '@/types/steam';
import {ArrowRight, X} from 'lucide-vue-next';
import {ref} from 'vue';

const props = defineProps<{
  selectionCount: number;
  storageUnits: StorageUnit[];
}>();

const emits = defineEmits<{
  deposit: [storageId: string];
  clear: [];
}>();

const showDropdown = ref(false);

function handleDeposit(storageId: string) {
  showDropdown.value = false;
  emits('deposit', storageId);
}
</script>

<template>
  <div
    v-if="selectionCount > 0"
    class="sticky bottom-0 flex items-center justify-between border-t border-border bg-background px-4 py-3"
  >
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">{{ selectionCount }} items selected</span>
      <Button
        variant="ghost"
        size="icon"
        @click="emits('clear')"
      >
        <X class="h-4 w-4" />
      </Button>
    </div>

    <div class="relative">
      <Button @click="showDropdown = !showDropdown">
        <span>Move to Storage</span>
        <ArrowRight class="h-4 w-4" />
      </Button>

      <div
        v-if="showDropdown"
        class="absolute bottom-full right-0 mb-2 w-64 rounded-md border border-border bg-popover p-1 shadow-lg"
      >
        <div
          v-if="storageUnits.length === 0"
          class="px-3 py-2 text-sm text-muted-foreground"
        >
          No storage units found
        </div>
        <button
          v-for="unit in storageUnits"
          :key="unit.id"
          class="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-accent"
          @click="handleDeposit(unit.id)"
        >
          <span class="truncate">{{ unit.custom_name || unit.name }}</span>
          <span class="text-xs text-muted-foreground">{{ unit.item_count }}/1000</span>
        </button>
      </div>
    </div>
  </div>
</template>
