<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import ItemTable from '@/components/inventory/ItemTable.vue';
import MoveItemsDialog from '@/components/storage/MoveItemsDialog.vue';
import RenameDialog from '@/components/storage/RenameDialog.vue';
import OperationProgress from '@/components/inventory/OperationProgress.vue';
import { useInventory } from '@/composables/useInventory';
import { useStorageUnits } from '@/composables/useStorageUnits';
import { useSelection } from '@/composables/useSelection';
import { ArrowLeft, Plus, Pencil, ArrowUpFromLine, Loader2 } from 'lucide-vue-next';
import { usePrices } from '@/composables/usePrices';

const route = useRoute();
const router = useRouter();

const storageId = computed(() => route.params.id as string);

const { items, storageUnits, fetchInventory, fetchStorageUnits } = useInventory();
const {
  inspectStorage,
  depositToStorage,
  retrieveFromStorage,
  renameStorage,
  getContents,
  operationProgress,
  operationInProgress,
} = useStorageUnits();
const {
  selectedIds,
  toggle: toggleSelection,
  toggleBatch: handleToggleGroup,
  clear: clearSelection,
} = useSelection();

const loading = ref(false);
const showAddDialog = ref(false);
const showRenameDialog = ref(false);

const { getTotalValue, formatPrice } = usePrices();

const contents = computed(() => getContents(storageId.value));
const currentUnit = computed(() => storageUnits.value.find(u => u.id === storageId.value));
const storageValue = computed(() => getTotalValue(contents.value));
const unitName = computed(
  () => currentUnit.value?.custom_name || currentUnit.value?.name || 'Storage Unit',
);

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([inspectStorage(storageId.value), fetchInventory(), fetchStorageUnits()]);
  } finally {
    loading.value = false;
  }
});

async function handleRetrieve() {
  const id = storageId.value;
  const itemIds = [...selectedIds.value];
  clearSelection();
  await retrieveFromStorage(id, itemIds);
  await refresh(id);
}

async function handleDeposit(itemIds: string[]) {
  const id = storageId.value;
  showAddDialog.value = false;
  await depositToStorage(id, itemIds);
  await refresh(id);
}

async function handleRename(name: string) {
  await renameStorage(storageId.value, name);
  await fetchStorageUnits();
}

async function refresh(id: string) {
  await Promise.all([inspectStorage(id), fetchInventory(), fetchStorageUnits()]);
}
</script>

<template>
  <AppLayout>
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-3 border-b border-(--ui-border) px-4 py-2">
        <UButton variant="ghost" color="neutral" square @click="router.push('/inventory')">
          <ArrowLeft class="h-4 w-4" />
        </UButton>

        <div class="flex-1">
          <h2 class="text-sm font-semibold">{{ unitName }}</h2>
          <p class="text-xs text-(--ui-text-muted)">
            {{ contents.length }} items
            <span v-if="storageValue > 0">&middot; {{ formatPrice(storageValue) }}</span>
          </p>
        </div>

        <UBadge variant="subtle" color="neutral"> {{ contents.length }}/1000 </UBadge>

        <UButton variant="outline" color="neutral" size="sm" @click="showRenameDialog = true">
          <Pencil class="h-3.5 w-3.5" />
          <span>Rename</span>
        </UButton>

        <UButton variant="outline" color="neutral" size="sm" @click="showAddDialog = true">
          <Plus class="h-3.5 w-3.5" />
          <span>Add Items</span>
        </UButton>
      </div>

      <!-- Contents -->
      <div v-if="loading" class="flex flex-1 items-center justify-center">
        <Loader2 class="h-8 w-8 animate-spin text-(--ui-text-muted)" />
      </div>

      <ItemTable
        v-else
        :items="contents"
        :selected-ids="selectedIds"
        @toggle-item="toggleSelection"
        @toggle-group="handleToggleGroup"
      />

      <!-- Retrieve bar -->
      <div
        v-if="selectedIds.size > 0"
        class="sticky bottom-0 flex items-center justify-between border-t border-(--ui-border) bg-(--ui-bg) px-4 py-3"
      >
        <span class="text-sm font-medium"> {{ selectedIds.size }} items selected </span>
        <UButton @click="handleRetrieve">
          <ArrowUpFromLine class="h-4 w-4" />
          <span>Retrieve from Storage</span>
        </UButton>
      </div>
    </div>

    <!-- Dialogs -->
    <MoveItemsDialog
      :open="showAddDialog"
      :items="items"
      :storage-name="unitName"
      @update:open="showAddDialog = $event"
      @confirm="handleDeposit"
    />

    <RenameDialog
      :open="showRenameDialog"
      :current-name="unitName"
      @update:open="showRenameDialog = $event"
      @confirm="handleRename"
    />

    <OperationProgress :progress="operationProgress" :in-progress="operationInProgress" />
  </AppLayout>
</template>
