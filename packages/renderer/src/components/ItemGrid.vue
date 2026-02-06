<script setup lang="ts">
import type {InventoryItem} from '@/types/steam';
import ItemCard from './ItemCard.vue';
import {ScrollArea} from '@/components/ui/scroll-area';

const props = defineProps<{
  items: InventoryItem[];
  selectedIds: Set<string>;
}>();

defineEmits<{
  toggleItem: [id: string];
}>();
</script>

<template>
  <ScrollArea class="h-full">
    <div
      v-if="items.length === 0"
      class="flex h-64 items-center justify-center text-muted-foreground"
    >
      No items found
    </div>
    <div
      v-else
      class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-4"
    >
      <ItemCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :selected="selectedIds.has(item.id)"
        @click="$emit('toggleItem', item.id)"
      />
    </div>
  </ScrollArea>
</template>
