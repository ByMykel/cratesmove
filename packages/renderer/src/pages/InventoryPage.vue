<script setup lang="ts">
import { onMounted, computed, watch, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import ItemTable from '@/components/inventory/ItemTable.vue';
import StorageUnitCard from '@/components/inventory/StorageUnitCard.vue';
import BulkActions from '@/components/inventory/BulkActions.vue';
import OperationProgress from '@/components/inventory/OperationProgress.vue';

import { useInventory } from '@/composables/useInventory';
import { useSelection } from '@/composables/useSelection';
import { useStorageUnits } from '@/composables/useStorageUnits';
import { usePrices } from '@/composables/usePrices';
import { Loader2, RefreshCw, Archive } from 'lucide-vue-next';

const router = useRouter();
const { items, storageUnits, loading, refreshAll } = useInventory();
const {
  selectedIds,
  selectionCount,
  toggle: toggleSelection,
  toggleBatch,
  clear: clearSelection,
} = useSelection();
const { operationProgress, operationInProgress, depositToStorage, inspectStorage, getContents } =
  useStorageUnits();
const { getTotalValue, formatPrice } = usePrices();

const inventoryValue = computed(() => getTotalValue(items.value));

const liveTotalValue = computed(() => {
  let total = inventoryValue.value;
  for (const unit of storageUnits.value) {
    total += getTotalValue(getContents(unit.id));
  }
  return total;
});

// Use a ref so we have full control over when the displayed total updates.
// During any operation (deposit or retrieve), items move between inventory and
// storageContents cache, but the cache is only refreshed after inspectStorage.
// This causes the live total to temporarily double-count or under-count items.
// We suppress updates while any operation is in progress (operationInProgress is
// shared across pages) and also during handleDeposit's post-operation refresh.
const totalAccountValue = ref(0);
let suppressTotal = false;

watchEffect(() => {
  const live = liveTotalValue.value;
  if (!operationInProgress.value && !suppressTotal) {
    totalAccountValue.value = live;
  }
});

function storageValue(unitId: string): number {
  return getTotalValue(getContents(unitId));
}

const inspectedIds = new Set<string>();

async function inspectAllUnits() {
  for (const unit of storageUnits.value) {
    if (inspectedIds.has(unit.id)) continue;
    inspectedIds.add(unit.id);
    try {
      await inspectStorage(unit.id);
    } catch {
      // Individual failure shouldn't block other units
    }
  }
}

onMounted(async () => {
  await refreshAll();
});

// Inspect storage units whenever they become available.
// Handles the case where the GC connects after the page mounts.
watch(storageUnits, () => inspectAllUnits());

async function handleDeposit(storageId: string) {
  const itemIds = [...selectedIds.value];
  clearSelection();
  suppressTotal = true;
  await depositToStorage(storageId, itemIds);
  await refreshAll();
  await inspectStorage(storageId);
  suppressTotal = false;
  totalAccountValue.value = liveTotalValue.value;
}

function openStorage(id: string) {
  router.push(`/storage/${id}`);
}
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
          <span class="text-(--ui-text-muted)">({{ items.length }})</span>
          <span v-if="inventoryValue > 0" class="ml-2 text-xs font-normal text-(--ui-text-muted)">
            {{ formatPrice(inventoryValue) }}
          </span>
          <span
            v-if="totalAccountValue > inventoryValue"
            class="ml-1 text-xs font-normal text-(--ui-text-muted)"
          >
            ({{ formatPrice(totalAccountValue) }} total)
          </span>
        </h2>
        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            square
            size="xs"
            :disabled="loading"
            @click="refreshAll"
          >
            <Loader2 v-if="loading" class="h-3.5 w-3.5 animate-spin" />
            <RefreshCw v-else class="h-3.5 w-3.5" />
          </UButton>
        </div>
      </div>

      <div v-if="loading && items.length === 0" class="flex flex-1 items-center justify-center">
        <Loader2 class="h-8 w-8 animate-spin text-(--ui-text-muted)" />
      </div>

      <ItemTable
        v-else
        :items="items"
        :selected-ids="selectedIds"
        @toggle-item="toggleSelection"
        @toggle-group="toggleBatch"
      />

      <BulkActions
        :selection-count="selectionCount"
        :storage-units="storageUnits"
        @deposit="handleDeposit"
        @clear="clearSelection"
      />
    </div>

    <!-- Storage units sidebar -->
    <div class="flex w-64 flex-col border-l border-(--ui-border)">
      <div class="flex h-10 items-center justify-between border-b border-(--ui-border) px-4">
        <h2 class="flex items-center gap-2 text-sm font-semibold">
          <Archive class="h-4 w-4" />
          Storage Units
        </h2>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div
          v-if="storageUnits.length === 0"
          class="flex flex-col items-center gap-2 p-4 text-center text-sm text-(--ui-text-muted)"
        >
          <p>No storage units found</p>
        </div>

        <div v-else class="p-1">
          <StorageUnitCard
            v-for="unit in storageUnits"
            :key="unit.id"
            :unit="unit"
            :price="storageValue(unit.id) > 0 ? formatPrice(storageValue(unit.id)) : undefined"
            @click="openStorage(unit.id)"
          />
        </div>
      </div>
    </div>

    <OperationProgress :progress="operationProgress" :in-progress="operationInProgress" />
  </AppLayout>
</template>
