<script setup lang="ts">
import { ref, computed } from 'vue';
import ItemTable from '@/components/inventory/ItemTable.vue';
import type { InventoryItem } from '@/types/steam';
import { useSelection } from '@/composables/useSelection';

const props = defineProps<{
  open: boolean;
  items: readonly InventoryItem[];
  storageName: string;
}>();

const emits = defineEmits<{
  'update:open': [value: boolean];
  confirm: [itemIds: string[]];
}>();

const search = ref('');
const { selectedIds, toggle, toggleBatch: handleToggleGroup, clear } = useSelection();

const filteredItems = computed(() => {
  const movable = props.items.filter(i => i.movable !== false);
  if (!search.value) return movable;
  const q = search.value.toLowerCase();
  return movable.filter(
    item => item.name.toLowerCase().includes(q) || item.market_hash_name.toLowerCase().includes(q),
  );
});

function handleConfirm() {
  emits('confirm', [...selectedIds.value]);
  clear();
  search.value = '';
}

function handleOpenChange(val: boolean) {
  emits('update:open', val);
  if (!val) {
    clear();
    search.value = '';
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="`Add Items to ${storageName}`"
    description="Select items from your inventory to deposit into this storage unit."
    @update:open="handleOpenChange"
  >
    <template #body>
      <UInput
        v-model="search"
        placeholder="Search items..."
        class="mb-2"
        :ui="{ root: 'w-full' }"
      />

      <div class="h-80">
        <ItemTable
          :items="filteredItems"
          :selected-ids="selectedIds"
          @toggle-item="toggle"
          @toggle-group="handleToggleGroup"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="outline" color="neutral" @click="handleOpenChange(false)">
          Cancel
        </UButton>
        <UButton :disabled="selectedIds.size === 0" @click="handleConfirm">
          Add {{ selectedIds.size }} items
        </UButton>
      </div>
    </template>
  </UModal>
</template>
