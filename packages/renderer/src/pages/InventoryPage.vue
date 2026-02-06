<script setup lang="ts">
import {onMounted, ref, computed} from 'vue';
import {useRouter} from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import ItemGrid from '@/components/ItemGrid.vue';
import StorageUnitCard from '@/components/StorageUnitCard.vue';
import BulkActions from '@/components/BulkActions.vue';
import OperationProgress from '@/components/OperationProgress.vue';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {useInventory} from '@/composables/useInventory';
import {useStorageUnits} from '@/composables/useStorageUnits';
import {Loader2, RefreshCw, Archive, Eye, EyeOff} from 'lucide-vue-next';

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
  clearSelection,
} = useInventory();
const {operationProgress, operationInProgress, depositToStorage} = useStorageUnits();

const showNonMovable = ref(false);
const displayedItems = computed(() =>
  showNonMovable.value ? items.value : items.value.filter(i => i.movable !== false),
);
const movableCount = computed(() => items.value.filter(i => i.movable !== false).length);

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
      <div class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 class="text-sm font-semibold">
          Inventory
          <span class="text-muted-foreground">({{ movableCount }})</span>
        </h2>
        <div class="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            class="h-6 gap-1 px-2 text-xs text-muted-foreground"
            @click="showNonMovable = !showNonMovable"
          >
            <EyeOff
              v-if="showNonMovable"
              class="h-3 w-3"
            />
            <Eye
              v-else
              class="h-3 w-3"
            />
            <span>{{ showNonMovable ? 'Hide' : 'Show' }} non-movable</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            :disabled="loading"
            @click="handleRefresh"
          >
            <Loader2
              v-if="loading"
              class="h-3.5 w-3.5 animate-spin"
            />
            <RefreshCw
              v-else
              class="h-3.5 w-3.5"
            />
          </Button>
        </div>
      </div>

      <div
        v-if="loading && items.length === 0"
        class="flex flex-1 items-center justify-center"
      >
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <ItemGrid
        v-else
        :items="displayedItems"
        :selected-ids="selectedItemIds"
        @toggle-item="toggleSelection"
      />

      <BulkActions
        :selection-count="selectionCount"
        :storage-units="storageUnits"
        @deposit="handleDeposit"
        @clear="clearSelection"
      />
    </div>

    <!-- Storage units sidebar -->
    <div class="flex w-64 flex-col border-l border-border">
      <div class="flex h-10 items-center justify-between border-b border-border px-4">
        <h2 class="flex items-center gap-2 text-sm font-semibold">
          <Archive class="h-4 w-4" />
          Storage Units
        </h2>
      </div>

      <ScrollArea class="flex-1">
        <div
          v-if="storageUnits.length === 0"
          class="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted-foreground"
        >
          <Archive class="h-8 w-8" />
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
      </ScrollArea>
    </div>

    <OperationProgress
      :progress="operationProgress"
      :in-progress="operationInProgress"
    />
  </AppLayout>
</template>
