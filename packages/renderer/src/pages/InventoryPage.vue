<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useVirtualizer } from '@tanstack/vue-virtual';
import AppLayout from '@/components/layout/AppLayout.vue';
import ItemTable from '@/components/inventory/ItemTable.vue';
import StorageUnitCard from '@/components/inventory/StorageUnitCard.vue';
import BulkActions from '@/components/inventory/BulkActions.vue';
import OperationProgress from '@/components/inventory/OperationProgress.vue';

import { useInventoryStore } from '@/composables/useInventoryStore';
import { useSelection } from '@/composables/useSelection';
import { usePrices } from '@/composables/usePrices';
import { useSteam } from '@/composables/useSteam';
import type { SortBy } from '@/composables/useItemGroups';
import FilterPanel from '@/components/inventory/FilterPanel.vue';
import { Loader2, RefreshCw, Archive, Search, SlidersHorizontal, Bug } from 'lucide-vue-next';
import { useDebugMode } from '@/composables/useDebugMode';

const router = useRouter();
const store = useInventoryStore();
const { switchingAccount } = useSteam();
const {
  selectedIds,
  selectionCount,
  toggle: toggleSelection,
  toggleBatch,
  clear: clearSelection,
} = useSelection();
const { getPrice, formatPrice } = usePrices();
const { debugEnabled, toggleDebug } = useDebugMode();

const search = ref('');
const rarityFilter = ref<string[]>([]);
const entityFilter = ref<string[]>([]);
const sortBy = ref<SortBy>('name');
const sidebarOpen = ref(false);
const filterPanelOpen = ref(false);

const availableRarities = computed(() => {
  const seen = new Map<string, string>();
  for (const item of store.inventoryItems.value) {
    if (item.rarity?.name && !seen.has(item.rarity.name)) {
      seen.set(item.rarity.name, item.rarity.color);
    }
  }
  return [...seen.entries()]
    .map(([name, color]) => ({ name, color }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const availableEntities = computed(() => {
  const set = new Set<string>();
  for (const item of store.inventoryItems.value) {
    if (item.entity) set.add(item.entity);
  }
  return [...set].sort();
});

const hasActiveFilters = computed(
  () => rarityFilter.value.length > 0 || entityFilter.value.length > 0 || sortBy.value !== 'name',
);

// Pre-compute all values in a single pass instead of per-unit iterations
const valueIndex = computed(() => {
  let invTotal = 0;
  let allTotal = 0;
  const byStorage = new Map<string, number>();

  for (const item of store.allItems.value) {
    const p = getPrice(item.market_hash_name);
    if (p == null) continue;
    allTotal += p;
    if (item.location.type === 'inventory') {
      invTotal += p;
    } else {
      const sid = item.location.storageId;
      byStorage.set(sid, (byStorage.get(sid) ?? 0) + p);
    }
  }

  return { invTotal, allTotal, byStorage };
});

const inventoryValue = computed(() => valueIndex.value.invTotal);
const totalAccountValue = computed(() => valueIndex.value.allTotal);

function storageValue(unitId: string): number {
  return valueIndex.value.byStorage.get(unitId) ?? 0;
}

const inspectedIds = new Set<string>();

async function inspectAllUnits() {
  const units = store.storageUnitList.value.filter(u => !inspectedIds.has(u.id));
  for (const unit of units) {
    inspectedIds.add(unit.id);
    try {
      await store.inspectStorage(unit.id);
    } catch {
      // Individual failure shouldn't block other units
    }
    // Throttle GC calls to avoid flooding
    await new Promise(r => setTimeout(r, 200));
  }
}

onMounted(async () => {
  await store.refreshAll();
});

// Inspect storage units whenever they become available.
// Handles the case where the GC connects after the page mounts.
watch(store.storageUnitList, () => inspectAllUnits());

watch([search, rarityFilter, entityFilter, sortBy], () => clearSelection());

// Clear component-local state when switching accounts so stale IDs
// don't prevent re-inspection or leave phantom selections.
watch(switchingAccount, switching => {
  if (switching) {
    inspectedIds.clear();
    clearSelection();
  }
});

async function handleDeposit(storageId: string) {
  const itemIds = [...selectedIds.value];
  clearSelection();
  await store.depositToStorage(storageId, itemIds);
  await store.inspectStorage(storageId);
  await store.refreshAll();
}

function openStorage(id: string) {
  router.push(`/storage/${id}`);
}

// Virtualize the storage units sidebar
const UNIT_HEIGHT = 40;
const sidebarScrollEl = ref<HTMLElement | null>(null);
const slideoverScrollEl = ref<HTMLElement | null>(null);

const sidebarVirtualizer = useVirtualizer({
  get count() {
    return store.storageUnitList.value.length;
  },
  getScrollElement: () => sidebarScrollEl.value,
  estimateSize: () => UNIT_HEIGHT,
  overscan: 10,
});

const slideoverVirtualizer = useVirtualizer({
  get count() {
    return store.storageUnitList.value.length;
  },
  getScrollElement: () => slideoverScrollEl.value,
  estimateSize: () => UNIT_HEIGHT,
  overscan: 10,
});
</script>

<template>
  <AppLayout>
    <!-- Main inventory panel -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <div
        class="flex h-10 shrink-0 items-center justify-between border-b border-(--ui-border) px-4"
      >
        <h2 class="text-sm font-semibold">
          Inventory
          <span class="text-(--ui-text-muted)">({{ store.inventoryItems.value.length }})</span>
          <span
            v-if="totalAccountValue > 0"
            class="ml-2 text-xs font-normal text-(--ui-text-muted)"
          >
            {{ formatPrice(inventoryValue > 0 ? inventoryValue : totalAccountValue) }}
          </span>
          <span
            v-if="totalAccountValue > inventoryValue && inventoryValue > 0"
            class="ml-1 text-xs font-normal text-(--ui-text-muted)"
          >
            ({{ formatPrice(totalAccountValue) }} total)
          </span>
        </h2>
        <div class="flex items-center gap-2">
          <UInput
            v-model="search"
            placeholder="Search items..."
            size="xs"
            :ui="{ root: 'w-48', base: 'h-[28px]' }"
          >
            <template #leading>
              <Search class="h-3.5 w-3.5 text-(--ui-text-muted)" />
            </template>
          </UInput>
          <UTooltip text="Filter & Sort">
            <UButton
              variant="ghost"
              color="neutral"
              square
              size="sm"
              class="relative"
              @click="filterPanelOpen = true"
            >
              <SlidersHorizontal class="h-4 w-4" />
              <span
                v-if="hasActiveFilters"
                class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-(--ui-primary)"
              />
            </UButton>
          </UTooltip>
          <UTooltip text="Refresh inventory">
            <UButton
              variant="ghost"
              color="neutral"
              square
              size="sm"
              :disabled="store.loading.value"
              @click="store.refreshAll"
            >
              <Loader2 v-if="store.loading.value" class="h-4 w-4 animate-spin" />
              <RefreshCw v-else class="h-4 w-4" />
            </UButton>
          </UTooltip>
          <UTooltip text="Storage Units" class="lg:hidden">
            <UButton variant="ghost" color="neutral" square size="sm" @click="sidebarOpen = true">
              <Archive class="h-4 w-4" />
            </UButton>
          </UTooltip>
        </div>
      </div>

      <div
        v-if="debugEnabled"
        class="flex shrink-0 items-center gap-2 border-b border-(--ui-border) bg-amber-500/10 px-4 py-1.5 text-xs text-amber-400"
      >
        <Bug class="h-3.5 w-3.5" />
        <span>Debug mode enabled</span>
        <button class="ml-auto underline hover:no-underline" @click="toggleDebug">Disable</button>
      </div>

      <div
        v-if="store.loading.value && store.inventoryItems.value.length === 0"
        class="flex flex-1 items-center justify-center"
      >
        <Loader2 class="h-8 w-8 animate-spin text-(--ui-text-muted)" />
      </div>

      <ItemTable
        v-else
        :items="store.inventoryItems.value"
        :selected-ids="selectedIds"
        :disabled="store.operationInProgress.value"
        :search="search"
        :rarity-filter="rarityFilter"
        :entity-filter="entityFilter"
        :sort-by="sortBy"
        @toggle-item="toggleSelection"
        @toggle-group="toggleBatch"
        @toggle-all="
          toggleBatch(store.inventoryItems.value.filter(i => i.movable !== false).map(i => i.id))
        "
      />

      <BulkActions
        :selection-count="selectionCount"
        :storage-units="store.storageUnitList.value"
        @deposit="handleDeposit"
        @clear="clearSelection"
      />
    </div>

    <!-- Storage units sidebar (large screens) -->
    <div class="hidden lg:flex w-96 flex-col border-l border-(--ui-border)">
      <div class="flex h-10 items-center justify-between border-b border-(--ui-border) px-4">
        <h2 class="flex items-center gap-2 text-sm font-semibold">
          <Archive class="h-4 w-4" />
          Storage Units
        </h2>
      </div>

      <div ref="sidebarScrollEl" class="flex-1 overflow-y-auto">
        <div
          v-if="store.storageUnitList.value.length > 0"
          class="relative"
          :style="{ height: `${sidebarVirtualizer.getTotalSize() + 8}px` }"
        >
          <StorageUnitCard
            v-for="vRow in sidebarVirtualizer.getVirtualItems()"
            :key="store.storageUnitList.value[vRow.index].id"
            :unit="store.storageUnitList.value[vRow.index]"
            :price="
              storageValue(store.storageUnitList.value[vRow.index].id) > 0
                ? formatPrice(storageValue(store.storageUnitList.value[vRow.index].id))
                : undefined
            "
            class="absolute left-1 right-1"
            :style="{ top: `${vRow.start + 4}px`, height: `${vRow.size}px` }"
            @click="openStorage(store.storageUnitList.value[vRow.index].id)"
          />
        </div>
      </div>
    </div>

    <!-- Storage units slideover (small screens) -->
    <USlideover
      v-model:open="sidebarOpen"
      side="right"
      title="Storage Units"
      description="Browse and select a storage unit"
    >
      <template #body>
        <div
          v-if="store.storageUnitList.value.length > 0"
          ref="slideoverScrollEl"
          class="relative h-full overflow-y-auto"
          :style="{ height: `${slideoverVirtualizer.getTotalSize()}px` }"
        >
          <StorageUnitCard
            v-for="vRow in slideoverVirtualizer.getVirtualItems()"
            :key="store.storageUnitList.value[vRow.index].id"
            :unit="store.storageUnitList.value[vRow.index]"
            :price="
              storageValue(store.storageUnitList.value[vRow.index].id) > 0
                ? formatPrice(storageValue(store.storageUnitList.value[vRow.index].id))
                : undefined
            "
            class="absolute left-0 right-0"
            :style="{ top: `${vRow.start}px`, height: `${vRow.size}px` }"
            @click="
              openStorage(store.storageUnitList.value[vRow.index].id);
              sidebarOpen = false;
            "
          />
        </div>
      </template>
    </USlideover>

    <FilterPanel
      v-model:open="filterPanelOpen"
      v-model:rarity-filter="rarityFilter"
      v-model:entity-filter="entityFilter"
      v-model:sort-by="sortBy"
      :rarities="availableRarities"
      :entities="availableEntities"
    />

    <OperationProgress
      :progress="store.operationProgress.value"
      :in-progress="store.operationInProgress.value"
    />
  </AppLayout>
</template>
