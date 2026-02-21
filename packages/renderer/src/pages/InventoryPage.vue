<script setup lang="ts">
import { onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import ItemTable from '@/components/inventory/ItemTable.vue';
import StorageUnitCard from '@/components/inventory/StorageUnitCard.vue';
import BulkActions from '@/components/inventory/BulkActions.vue';
import OperationProgress from '@/components/inventory/OperationProgress.vue';

import { useInventoryStore } from '@/composables/useInventoryStore';
import { useSelection } from '@/composables/useSelection';
import { usePrices } from '@/composables/usePrices';
import { useSteam } from '@/composables/useSteam';
import { Loader2, RefreshCw, Archive } from 'lucide-vue-next';

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
const { getTotalValue, formatPrice } = usePrices();

const inventoryValue = computed(() => getTotalValue(store.inventoryItems.value));
const totalAccountValue = computed(() => getTotalValue(store.allItems.value));

function storageValue(unitId: string): number {
  return getTotalValue(store.getStorageContents(unitId));
}

const inspectedIds = new Set<string>();

async function inspectAllUnits() {
  for (const unit of store.storageUnitList.value) {
    if (inspectedIds.has(unit.id)) continue;
    inspectedIds.add(unit.id);
    try {
      await store.inspectStorage(unit.id);
    } catch {
      // Individual failure shouldn't block other units
    }
  }
}

onMounted(async () => {
  await store.refreshAll();
});

// Inspect storage units whenever they become available.
// Handles the case where the GC connects after the page mounts.
watch(store.storageUnitList, () => inspectAllUnits());

// Clear component-local state when switching accounts so stale IDs
// don't prevent re-inspection or leave phantom selections.
watch(switchingAccount, (switching) => {
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
          <UButton
            variant="ghost"
            color="neutral"
            square
            size="xs"
            :disabled="store.loading.value"
            @click="store.refreshAll"
          >
            <Loader2 v-if="store.loading.value" class="h-3.5 w-3.5 animate-spin" />
            <RefreshCw v-else class="h-3.5 w-3.5" />
          </UButton>
        </div>
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
          v-if="store.storageUnitList.value.length === 0"
          class="flex flex-col items-center gap-2 p-4 text-center text-sm text-(--ui-text-muted)"
        >
          <p>No storage units found</p>
        </div>

        <div v-else class="p-1">
          <StorageUnitCard
            v-for="unit in store.storageUnitList.value"
            :key="unit.id"
            :unit="unit"
            :price="storageValue(unit.id) > 0 ? formatPrice(storageValue(unit.id)) : undefined"
            @click="openStorage(unit.id)"
          />
        </div>
      </div>
    </div>

    <OperationProgress
      :progress="store.operationProgress.value"
      :in-progress="store.operationInProgress.value"
    />
  </AppLayout>
</template>
