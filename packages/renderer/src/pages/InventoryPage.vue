<script setup lang="ts">
import {onMounted} from 'vue';
import {useRouter} from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import ItemTable from '@/components/ItemTable.vue';
import StorageUnitCard from '@/components/StorageUnitCard.vue';
import BulkActions from '@/components/BulkActions.vue';
import OperationProgress from '@/components/OperationProgress.vue';

import {useInventory} from '@/composables/useInventory';
import {useStorageUnits} from '@/composables/useStorageUnits';
import {Loader2, RefreshCw, Archive} from 'lucide-vue-next';

const router = useRouter();
const {
  items,
  storageUnits,
  selectedItemIds,
  selectionCount,
  loading,
  fetchInventory,
  fetchStorageUnits,
  toggleSelection,
  toggleBatch,
  clearSelection,
} = useInventory();
const {operationProgress, operationInProgress, depositToStorage} = useStorageUnits();

onMounted(async () => {
  await Promise.all([fetchInventory(), fetchStorageUnits()]);
});

async function handleRefresh() {
  await Promise.all([fetchInventory(), fetchStorageUnits()]);
}

async function handleDeposit(storageId: string) {
  const itemIds = [...selectedItemIds.value];
  clearSelection();
  await depositToStorage(storageId, itemIds);
  await Promise.all([fetchInventory(), fetchStorageUnits()]);
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
        </h2>
        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            square
            size="xs"
            :disabled="loading"
            @click="handleRefresh"
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
        :selected-ids="selectedItemIds"
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
            @click="openStorage(unit.id)"
          />
        </div>
      </div>
    </div>

    <OperationProgress :progress="operationProgress" :in-progress="operationInProgress" />
  </AppLayout>
</template>
