<script setup lang="ts">
import {ref, computed} from 'vue';
import ItemCard from './ItemCard.vue';
import type {InventoryItem} from '@/types/steam';

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
const selectedIds = ref<Set<string>>(new Set());

const filteredItems = computed(() => {
  const movable = props.items.filter(i => i.movable !== false);
  if (!search.value) return movable;
  const q = search.value.toLowerCase();
  return movable.filter(
    item => item.name.toLowerCase().includes(q) || item.market_hash_name.toLowerCase().includes(q),
  );
});

function toggle(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
}

function handleConfirm() {
  emits('confirm', [...selectedIds.value]);
  selectedIds.value = new Set();
  search.value = '';
}

function handleOpenChange(val: boolean) {
  emits('update:open', val);
  if (!val) {
    selectedIds.value = new Set();
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
      <UInput v-model="search" placeholder="Search items..." class="mb-2" />

      <div class="h-80 overflow-y-auto">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-1">
          <ItemCard
            v-for="item in filteredItems"
            :key="item.id"
            :item="item"
            :selected="selectedIds.has(item.id)"
            @click="toggle(item.id)"
          />
        </div>
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
