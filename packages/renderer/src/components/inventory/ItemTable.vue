<script setup lang="ts">
import { ref, computed, toRef } from 'vue';
import { useClipboard } from '@vueuse/core';
import { useVirtualizer } from '@tanstack/vue-virtual';
import type { InventoryItem } from '@/types/steam';
import { useItemGroups, type ItemGroup } from '@/composables/useItemGroups';
import { ChevronRight, ClipboardCopy, Check, TriangleAlert } from 'lucide-vue-next';
import { usePrices } from '@/composables/usePrices';

const { getPrice, formatPrice } = usePrices();

function thumb(url: string, size = '62fx62f') {
  if (!url || !url.includes('community.akamai.steamstatic.com')) return url;
  return `${url}/${size}`;
}

const props = defineProps<{
  items: readonly InventoryItem[];
  selectedIds: ReadonlySet<string>;
  disabled?: boolean;
  search?: string;
}>();

const emit = defineEmits<{
  toggleItem: [id: string];
  toggleGroup: [ids: string[]];
  toggleAll: [];
}>();

const { groups } = useItemGroups(
  toRef(() => props.items),
  toRef(() => props.search ?? ''),
);

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

const allMovableIds = computed(() => props.items.filter(i => i.movable !== false).map(i => i.id));

const allCheckValue = computed<boolean | 'indeterminate'>(() => {
  if (allMovableIds.value.length === 0) return false;
  const selectedCount = allMovableIds.value.filter(id => props.selectedIds.has(id)).length;
  if (selectedCount === 0) return false;
  if (selectedCount === allMovableIds.value.length) return true;
  return 'indeterminate';
});

const hasItems = computed(() => props.items.length > 0);

const { copy } = useClipboard();
const copiedId = ref<string | null>(null);

async function copyRawData(item: InventoryItem) {
  if (!item._rawData) return;
  await copy(item._rawData);
  copiedId.value = item.id;
  setTimeout(() => {
    copiedId.value = null;
  }, 2000);
}

function openOnMarket(marketHashName: string) {
  const url = `https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketHashName)}`;
  window.open(url, '_blank');
}

// Flatten groups + expanded children into a single row list for virtualization
type FlatRow =
  | { type: 'group'; key: string; group: ItemGroup }
  | { type: 'item'; key: string; item: InventoryItem };

const flatRows = computed<FlatRow[]>(() => {
  const rows: FlatRow[] = [];
  for (const group of groups.value) {
    rows.push({ type: 'group', key: `g-${group.market_hash_name}`, group });
    if (
      !group._parseError &&
      group.items.length > 1 &&
      expandedGroups.value.has(group.market_hash_name)
    ) {
      for (const item of group.items) {
        rows.push({ type: 'item', key: `i-${item.id}`, item });
      }
    }
  }
  return rows;
});

const ROW_HEIGHT = 42;
const scrollEl = ref<HTMLElement | null>(null);

const virtualizer = useVirtualizer({
  get count() {
    return flatRows.value.length;
  },
  getScrollElement: () => scrollEl.value,
  estimateSize: () => ROW_HEIGHT,
  overscan: 20,
});

// Helpers to avoid verbose inline casts in the template
function rowAt(idx: number) {
  return flatRows.value[idx];
}
function groupAt(idx: number) {
  return (flatRows.value[idx] as { type: 'group'; key: string; group: ItemGroup }).group;
}
function itemAt(idx: number) {
  return (flatRows.value[idx] as { type: 'item'; key: string; item: InventoryItem }).item;
}

// Controlled dropdown — only one open at a time
const openMenuId = ref<string | null>(null);
</script>

<template>
  <div ref="scrollEl" class="relative isolate h-full overflow-y-auto">
    <table v-if="hasItems" class="w-full text-sm" style="table-layout: fixed">
      <colgroup>
        <col class="w-9" />
        <col class="w-6" />
        <col class="w-16" />
        <col />
        <col class="w-10" />
        <col class="w-24" />
        <col class="w-10" />
      </colgroup>
      <thead class="sticky top-0 z-[1] backdrop-blur-xl bg-(--ui-bg)/60">
        <tr class="text-left text-xs text-(--ui-text-muted)">
          <th class="px-2 py-3" @click.stop>
            <UCheckbox
              size="lg"
              :model-value="allCheckValue"
              :disabled="props.disabled || allMovableIds.length === 0"
              @update:model-value="emit('toggleAll')"
            />
          </th>
          <th class="px-2 py-3"></th>
          <th class="py-3"></th>
          <th class="px-2 py-3 font-semibold">Name</th>
          <th class="px-2 py-3 font-semibold">Qty</th>
          <th class="px-2 py-3 font-semibold text-right">Price</th>
          <th class="px-2 py-3"></th>
        </tr>
        <tr>
          <td colspan="7" class="h-px bg-(--ui-border)"></td>
        </tr>
      </thead>
      <tbody>
        <!-- Height spacer for virtualization -->
        <tr>
          <td colspan="7" style="padding: 0; border: none">
            <div :style="{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }">
              <template v-for="vRow in virtualizer.getVirtualItems()" :key="rowAt(vRow.index).key">
                <!-- GROUP ROW: parse error -->
                <table
                  v-if="rowAt(vRow.index).type === 'group' && groupAt(vRow.index)._parseError"
                  class="w-full text-sm"
                  style="table-layout: fixed; position: absolute; left: 0"
                  :style="{ top: `${vRow.start}px`, height: `${vRow.size}px` }"
                >
                  <colgroup>
                    <col class="w-9" />
                    <col class="w-6" />
                    <col class="w-16" />
                    <col />
                    <col class="w-10" />
                    <col class="w-24" />
                    <col class="w-10" />
                  </colgroup>
                  <tbody>
                    <tr
                      class="border-t border-(--ui-border)/50 transition-colors hover:bg-(--ui-bg-elevated)/50"
                    >
                      <td class="px-2 py-0 align-middle"></td>
                      <td class="px-2 py-0 align-middle">
                        <TriangleAlert class="h-3.5 w-3.5 text-amber-500" />
                      </td>
                      <td colspan="2" class="px-2 py-2 align-middle">
                        <p class="text-xs text-(--ui-text-muted)">
                          Failed to load this item. Copy the raw data and share it so we can fix
                          this.
                        </p>
                      </td>
                      <td class="px-2 py-0 align-middle">
                        <button
                          class="inline-flex items-center justify-center rounded p-1 transition-colors hover:bg-(--ui-bg-elevated)"
                          title="Copy raw data"
                          @click="copyRawData(groupAt(vRow.index).items[0])"
                        >
                          <Check
                            v-if="copiedId === groupAt(vRow.index).items[0].id"
                            class="h-3.5 w-3.5 text-green-500"
                          />
                          <ClipboardCopy v-else class="h-3.5 w-3.5 text-(--ui-text-muted)" />
                        </button>
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>

                <!-- GROUP ROW: normal -->
                <table
                  v-else-if="rowAt(vRow.index).type === 'group'"
                  class="w-full text-sm"
                  style="table-layout: fixed; position: absolute; left: 0"
                  :style="{ top: `${vRow.start}px`, height: `${vRow.size}px` }"
                >
                  <colgroup>
                    <col class="w-9" />
                    <col class="w-6" />
                    <col class="w-16" />
                    <col />
                    <col class="w-10" />
                    <col class="w-24" />
                    <col class="w-10" />
                  </colgroup>
                  <tbody>
                    <tr
                      class="border-t border-(--ui-border)/50 transition-colors hover:bg-(--ui-bg-elevated)/50"
                      :class="{
                        'opacity-40': !groupAt(vRow.index).movable,
                        'cursor-pointer': groupAt(vRow.index).items.length > 1,
                      }"
                      :tabindex="groupAt(vRow.index).items.length > 1 ? 0 : -1"
                      @click="
                        groupAt(vRow.index).items.length > 1 &&
                        toggleExpand(groupAt(vRow.index).market_hash_name)
                      "
                      @keydown.enter="
                        groupAt(vRow.index).items.length > 1 &&
                        toggleExpand(groupAt(vRow.index).market_hash_name)
                      "
                      @keydown.space.prevent="
                        groupAt(vRow.index).items.length > 1 &&
                        toggleExpand(groupAt(vRow.index).market_hash_name)
                      "
                    >
                      <td class="relative px-2 py-0 align-middle" @click.stop>
                        <div
                          v-if="groupAt(vRow.index).rarity?.color"
                          class="absolute inset-y-0 left-0 w-[3px]"
                          :style="{ backgroundColor: groupAt(vRow.index).rarity!.color }"
                        />
                        <UCheckbox
                          size="lg"
                          :model-value="groupCheckValue(groupAt(vRow.index))"
                          :disabled="props.disabled || !groupAt(vRow.index).movable"
                          @update:model-value="handleGroupCheckbox(groupAt(vRow.index))"
                        />
                      </td>
                      <td class="px-2 py-0 align-middle">
                        <ChevronRight
                          v-if="groupAt(vRow.index).items.length > 1"
                          class="h-3.5 w-3.5 transition-transform"
                          :class="{
                            'rotate-90': expandedGroups.has(groupAt(vRow.index).market_hash_name),
                          }"
                        />
                      </td>
                      <td class="py-1 align-middle">
                        <div class="flex items-center justify-center">
                          <img
                            :src="thumb(groupAt(vRow.index).image)"
                            :alt="groupAt(vRow.index).market_hash_name"
                            class="h-8 w-auto object-contain"
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td class="px-2 py-0 align-middle font-medium">
                        {{ groupAt(vRow.index).market_hash_name }}
                      </td>
                      <td class="px-2 py-0 align-middle tabular-nums text-(--ui-text-muted)">
                        {{ groupAt(vRow.index).items.length }}
                      </td>
                      <td
                        class="px-2 py-0 align-middle text-right tabular-nums text-(--ui-text-muted)"
                      >
                        {{
                          getPrice(groupAt(vRow.index).market_hash_name) != null
                            ? formatPrice(
                                getPrice(groupAt(vRow.index).market_hash_name)! *
                                  groupAt(vRow.index).items.length,
                              )
                            : '--'
                        }}
                      </td>
                      <td class="px-2 py-0 align-middle" @click.stop>
                        <UDropdownMenu
                          v-if="groupAt(vRow.index).movable"
                          :open="openMenuId === groupAt(vRow.index).market_hash_name"
                          :items="[
                            {
                              label: 'View in Community Market',
                              onSelect: () => openOnMarket(groupAt(vRow.index).market_hash_name),
                            },
                          ]"
                          @update:open="
                            (v: boolean) =>
                              (openMenuId = v ? groupAt(vRow.index).market_hash_name : null)
                          "
                        >
                          <UButton
                            icon="i-lucide-ellipsis"
                            variant="ghost"
                            color="neutral"
                            size="xs"
                          />
                        </UDropdownMenu>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- ITEM ROW (expanded child) -->
                <table
                  v-else
                  class="w-full text-sm"
                  style="table-layout: fixed; position: absolute; left: 0"
                  :style="{ top: `${vRow.start}px`, height: `${vRow.size}px` }"
                >
                  <colgroup>
                    <col class="w-9" />
                    <col class="w-6" />
                    <col class="w-16" />
                    <col />
                    <col class="w-10" />
                    <col class="w-24" />
                    <col class="w-10" />
                  </colgroup>
                  <tbody>
                    <tr
                      class="transition-colors hover:bg-(--ui-bg-elevated)/30"
                      :class="{ 'opacity-40': itemAt(vRow.index).movable === false }"
                    >
                      <td class="relative px-2 py-0 align-middle" @click.stop>
                        <div
                          v-if="itemAt(vRow.index).rarity?.color"
                          class="absolute inset-y-0 left-0 w-[3px]"
                          :style="{ backgroundColor: itemAt(vRow.index).rarity!.color }"
                        />
                        <UCheckbox
                          size="lg"
                          :model-value="selectedIds.has(itemAt(vRow.index).id)"
                          :disabled="props.disabled || itemAt(vRow.index).movable === false"
                          @update:model-value="handleItemCheckbox(itemAt(vRow.index))"
                        />
                      </td>
                      <td class="px-2 py-0"></td>
                      <td class="py-1 align-middle">
                        <div class="flex items-center justify-center">
                          <img
                            :src="thumb(itemAt(vRow.index).image)"
                            :alt="itemAt(vRow.index).name"
                            class="h-6 w-auto object-contain"
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td class="px-2 py-0 align-middle text-xs text-(--ui-text-muted)">
                        {{ itemAt(vRow.index).custom_name || itemAt(vRow.index).name }}
                        <span v-if="itemAt(vRow.index).paint_wear != null" class="ml-1 opacity-60">
                          ({{ itemAt(vRow.index).paint_wear!.toFixed(4) }})
                        </span>
                      </td>
                      <td></td>
                      <td
                        class="px-2 py-0 align-middle text-right tabular-nums text-(--ui-text-muted) text-xs"
                      >
                        {{ formatPrice(getPrice(itemAt(vRow.index).market_hash_name)) }}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </template>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
