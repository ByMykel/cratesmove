<script setup lang="ts">
import {ref, computed} from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import ItemCard from './ItemCard.vue';
import {ScrollArea} from '@/components/ui/scroll-area';
import type {InventoryItem} from '@/types/steam';

const props = defineProps<{
  open: boolean;
  items: InventoryItem[];
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
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Add Items to {{ storageName }}</DialogTitle>
        <DialogDescription>
          Select items from your inventory to deposit into this storage unit.
        </DialogDescription>
      </DialogHeader>

      <Input v-model="search" placeholder="Search items..." class="mb-2" />

      <ScrollArea class="h-80">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-1">
          <ItemCard
            v-for="item in filteredItems"
            :key="item.id"
            :item="item"
            :selected="selectedIds.has(item.id)"
            @click="toggle(item.id)"
          />
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" @click="handleOpenChange(false)"> Cancel </Button>
        <Button :disabled="selectedIds.size === 0" @click="handleConfirm">
          Add {{ selectedIds.size }} items
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
