<script setup lang="ts">
import type {InventoryItem} from '@/types/steam';
import ItemCard from './ItemCard.vue';

defineProps<{
  items: readonly InventoryItem[];
  selectedIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  toggleItem: [id: string];
}>();

function handleClick(item: InventoryItem) {
  if (item.movable === false) return;
  emit('toggleItem', item.id);
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div
      v-if="!items || items.length === 0"
      class="flex h-64 items-center justify-center text-(--ui-text-muted)"
    >
      No items found
    </div>
    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-4">
      <ItemCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :selected="selectedIds.has(item.id)"
        @click="handleClick(item)"
      />
    </div>
  </div>
</template>
