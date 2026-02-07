<script setup lang="ts">
import type {StorageUnit} from '@/types/steam';
import {ArrowRight, X, Archive} from 'lucide-vue-next';
import {ref} from 'vue';

defineProps<{
  selectionCount: number;
  storageUnits: readonly StorageUnit[];
}>();

const emits = defineEmits<{
  deposit: [storageId: string];
  clear: [];
}>();

const showDialog = ref(false);

function handleDeposit(storageId: string) {
  showDialog.value = false;
  emits('deposit', storageId);
}
</script>

<template>
  <div
    v-if="selectionCount > 0"
    class="sticky bottom-0 flex items-center justify-between border-t border-(--ui-border) bg-(--ui-bg) px-4 py-3"
  >
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">{{ selectionCount }} items selected</span>
      <UButton variant="ghost" color="neutral" square size="xs" @click="emits('clear')">
        <X class="h-4 w-4" />
      </UButton>
    </div>

    <UButton @click="showDialog = true">
      <span>Move to Storage</span>
      <ArrowRight class="h-4 w-4" />
    </UButton>

    <UModal
      v-model:open="showDialog"
      title="Move to Storage"
      :description="`Select a storage unit to deposit ${selectionCount} items into.`"
    >
      <template #body>
        <div
          v-if="storageUnits.length === 0"
          class="py-4 text-center text-sm text-(--ui-text-muted)"
        >
          No storage units found
        </div>

        <div v-else class="flex flex-col gap-1">
          <button
            v-for="unit in storageUnits"
            :key="unit.id"
            class="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-(--ui-bg-elevated)"
            @click="handleDeposit(unit.id)"
          >
            <Archive class="h-4 w-4 shrink-0 text-(--ui-text-muted)" />
            <span class="flex-1 truncate text-left">{{ unit.custom_name || unit.name }}</span>
            <span class="text-xs text-(--ui-text-muted)">{{ unit.item_count }}/1000</span>
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>
