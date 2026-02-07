<script setup lang="ts">
import {ref, computed, toRef} from 'vue';
import type {InventoryItem} from '@/types/steam';
import {useItemGroups, type ItemGroup} from '@/composables/useItemGroups';
import {usePrices} from '@/composables/usePrices';
import {ChevronRight} from 'lucide-vue-next';

const {getPrice, formatPrice} = usePrices();

const props = defineProps<{
  items: readonly InventoryItem[];
  selectedIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  toggleItem: [id: string];
  toggleGroup: [ids: string[]];
}>();

const {groups} = useItemGroups(toRef(props, 'items'));

const expandedGroups = ref<Set<string>>(new Set());

function toggleExpand(name: string) {
  const next = new Set(expandedGroups.value);
  if (next.has(name)) {
    next.delete(name);
  } else {
    next.add(name);
  }
  expandedGroups.value = next;
}

function groupCheckValue(group: ItemGroup): boolean | 'indeterminate' {
  if (!group.movable) return false;
  const movableItems = group.items.filter(i => i.movable !== false);
  const selectedCount = movableItems.filter(i => props.selectedIds.has(i.id)).length;
  if (selectedCount === 0) return false;
  if (selectedCount === movableItems.length) return true;
  return 'indeterminate';
}

function handleGroupCheckbox(group: ItemGroup) {
  const movableIds = group.items.filter(i => i.movable !== false).map(i => i.id);
  emit('toggleGroup', movableIds);
}

function handleItemCheckbox(item: InventoryItem) {
  if (item.movable === false) return;
  emit('toggleItem', item.id);
}

const hasItems = computed(() => props.items.length > 0);
</script>

<template>
  <div class="relative h-full overflow-y-auto">
    <div v-if="!hasItems" class="flex h-64 items-center justify-center text-(--ui-text-muted)">
      No items found
    </div>

    <table v-else class="w-full text-sm" style="table-layout: fixed">
      <colgroup>
        <col class="w-9" />
        <col class="w-6" />
        <col class="w-16" />
        <col />
        <col class="w-10" />
        <col class="w-24" />
      </colgroup>
      <thead class="sticky top-0 z-10 backdrop-blur-xl bg-(--ui-bg)/60">
        <tr class="text-left text-xs text-(--ui-text-muted)">
          <th class="px-2 py-3"></th>
          <th class="px-2 py-3"></th>
          <th class="py-3"></th>
          <th class="px-2 py-3 font-semibold">Name</th>
          <th class="px-2 py-3 font-semibold">Qty</th>
          <th class="px-2 py-3 font-semibold text-right">Price</th>
        </tr>
        <tr>
          <td colspan="6" class="h-px bg-(--ui-border)"></td>
        </tr>
      </thead>
      <tbody class="divide-y divide-(--ui-border)/50">
        <template v-for="group in groups" :key="group.market_hash_name">
          <tr
            class="transition-colors hover:bg-(--ui-bg-elevated)/50"
            :class="{'opacity-40': !group.movable, 'cursor-pointer': group.items.length > 1}"
            @click="group.items.length > 1 && toggleExpand(group.market_hash_name)"
          >
            <td class="px-2 py-0 align-middle" @click.stop>
              <UCheckbox
                size="lg"
                :model-value="groupCheckValue(group)"
                :disabled="!group.movable"
                @update:model-value="handleGroupCheckbox(group)"
              />
            </td>
            <td class="px-2 py-0 align-middle">
              <ChevronRight
                v-if="group.items.length > 1"
                class="h-3.5 w-3.5 transition-transform"
                :class="{'rotate-90': expandedGroups.has(group.market_hash_name)}"
              />
            </td>
            <td class="py-1 align-middle">
              <div class="flex items-center justify-center">
                <img
                  :src="group.image"
                  :alt="group.market_hash_name"
                  class="h-8 w-auto object-contain"
                  loading="lazy"
                />
              </div>
            </td>
            <td class="px-2 py-0 align-middle font-medium">{{ group.market_hash_name }}</td>
            <td class="px-2 py-0 align-middle tabular-nums text-(--ui-text-muted)">
              {{ group.items.length }}
            </td>
            <td class="px-2 py-0 align-middle text-right tabular-nums text-(--ui-text-muted)">
              {{ getPrice(group.market_hash_name) != null
                ? formatPrice(getPrice(group.market_hash_name)! * group.items.length)
                : '--' }}
            </td>
          </tr>

          <template v-if="group.items.length > 1 && expandedGroups.has(group.market_hash_name)">
            <tr
              v-for="item in group.items"
              :key="item.id"
              class="transition-colors hover:bg-(--ui-bg-elevated)/30"
              :class="{'opacity-40': item.movable === false}"
            >
              <td class="px-2 py-0 align-middle" @click.stop>
                <UCheckbox
                  size="lg"
                  :model-value="selectedIds.has(item.id)"
                  :disabled="item.movable === false"
                  @update:model-value="handleItemCheckbox(item)"
                />
              </td>
              <td class="px-2 py-0"></td>
              <td class="py-1 align-middle">
                <div class="flex items-center justify-center">
                  <img
                    :src="item.image"
                    :alt="item.name"
                    class="h-6 w-auto object-contain"
                    loading="lazy"
                  />
                </div>
              </td>
              <td class="px-2 py-0 align-middle text-xs text-(--ui-text-muted)">
                {{ item.custom_name || item.name }}
                <span v-if="item.paint_wear != null" class="ml-1 opacity-60">
                  ({{ item.paint_wear.toFixed(4) }})
                </span>
              </td>
              <td class="px-2 py-0 align-middle text-right tabular-nums text-(--ui-text-muted) text-xs">
                {{ formatPrice(getPrice(item.market_hash_name)) }}
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </div>
</template>
