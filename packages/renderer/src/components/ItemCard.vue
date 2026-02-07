<script setup lang="ts">
import type {InventoryItem} from '@/types/steam';
import {computed} from 'vue';
import {useInventory} from '@/composables/useInventory';

const props = defineProps<{
  item: InventoryItem;
  selected?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

const {getRawItem} = useInventory();

function handleClick() {
  const raw = getRawItem(props.item.id);
  if (!raw) {
    console.warn('[ItemCard] Raw GC data not found for item:', props.item.id);
  } else {
    console.log('[ItemCard] Raw GC data:', raw);
  }
  emit('click');
}

const wearLabel = computed(() => {
  const w = props.item.paint_wear;
  if (w === null || w === undefined) return null;
  if (w < 0.07) return 'FN';
  if (w < 0.15) return 'MW';
  if (w < 0.38) return 'FT';
  if (w < 0.45) return 'WW';
  return 'BS';
});

const imageUrl = computed(() => {
  if (!props.item.icon_url) return '';
  if (props.item.icon_url.startsWith('http')) return props.item.icon_url;
  return `https://community.akamai.steamstatic.com/economy/image/${props.item.icon_url}/330x192`;
});

const borderStyle = computed(() => {
  const color = props.item.rarity_color;
  if (color) return {borderLeftColor: color};
  return {borderLeftColor: '#4b5563'};
});

const cardClasses = computed(() => {
  const base = 'group relative rounded-md border-l-2 bg-(--ui-bg-elevated)/50 p-2 transition-colors';
  const interactive = props.item.movable !== false ? 'cursor-pointer hover:bg-(--ui-bg-elevated)' : 'opacity-40 cursor-default';
  const selection = props.selected ? 'ring-2 ring-(--ui-primary) bg-(--ui-bg-elevated)' : '';
  return `${base} ${interactive} ${selection}`;
});
</script>

<template>
  <div
    :class="cardClasses"
    :style="borderStyle"
    @click="handleClick"
  >
    <div class="flex flex-col items-center gap-1">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="item.name"
        class="h-16 w-auto object-contain"
        loading="lazy"
      />
      <div v-else class="flex h-16 w-full items-center justify-center text-(--ui-text-muted)">
        <span class="text-2xl">?</span>
      </div>
      <div class="w-full text-center">
        <p class="truncate text-xs font-medium">
          {{ item.custom_name || item.name }}
        </p>
        <p v-if="wearLabel" class="text-[10px] text-(--ui-text-muted)">
          {{ wearLabel }}
        </p>
      </div>
    </div>

    <!-- Selection indicator -->
    <div
      v-if="selected"
      class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-(--ui-primary) text-[10px] text-(--ui-bg)"
    >
      ✓
    </div>
  </div>
</template>
