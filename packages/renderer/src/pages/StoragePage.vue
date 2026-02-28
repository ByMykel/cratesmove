<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import ItemTable from '@/components/inventory/ItemTable.vue';
import RenameDialog from '@/components/storage/RenameDialog.vue';
import OperationProgress from '@/components/inventory/OperationProgress.vue';
import { useInventoryStore } from '@/composables/useInventoryStore';
import { useSelection } from '@/composables/useSelection';
import { ArrowLeft, Pencil, Archive, Loader2, Search } from 'lucide-vue-next';
import { usePrices } from '@/composables/usePrices';

const route = useRoute();
const router = useRouter();

const storageId = computed(() => route.params.id as string);

const store = useInventoryStore();
const {
  selectedIds,
  toggle: toggleSelection,
  toggleBatch: handleToggleGroup,
  clear: clearSelection,
} = useSelection();

const loading = ref(false);
const showRenameDialog = ref(false);
const showMoveDialog = ref(false);
const search = ref('');

const { getTotalValue, formatPrice } = usePrices();

const contents = computed(() => store.getStorageContents(storageId.value));
const currentUnit = computed(() => store.storageUnits.value.get(storageId.value));
const storageValue = computed(() => getTotalValue(contents.value));
const unitName = computed(
  () => currentUnit.value?.custom_name || currentUnit.value?.name || 'Storage Unit',
);
const otherStorageUnits = computed(() =>
  store.storageUnitList.value.filter(u => u.id !== storageId.value),
);

watch(search, () => clearSelection());

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([
      store.inspectStorage(storageId.value),
      store.fetchInventory(),
      store.fetchStorageUnits(),
    ]);
  } finally {
    loading.value = false;
  }
});

async function handleRetrieve() {
  const id = storageId.value;
  const itemIds = [...selectedIds.value];
  clearSelection();
  await store.retrieveFromStorage(id, itemIds);
  await refresh(id);
}

async function handleMoveToStorage(targetStorageId: string) {
  showMoveDialog.value = false;
  const id = storageId.value;
  const itemIds = [...selectedIds.value];
  clearSelection();
  await store.moveToStorage(id, targetStorageId, itemIds);
  await Promise.all([
    store.inspectStorage(id),
    store.inspectStorage(targetStorageId),
    store.refreshAll(),
  ]);
}

const toast = useToast();

async function handleRename(name: string) {
  await store.renameStorage(storageId.value, name);
  await store.fetchStorageUnits();
  toast.add({ title: `Renamed to "${name}"`, color: 'success' });
}

async function refresh(id: string) {
  await Promise.all([store.inspectStorage(id), store.fetchInventory(), store.fetchStorageUnits()]);
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

        <UButton
          variant="outline"
          color="neutral"
          size="sm"
          class="h-[28px]"
          @click="showRenameDialog = true"
        >
          <Pencil class="h-3.5 w-3.5" />
          <span>Rename</span>
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
        :disabled="store.operationInProgress.value"
        :search="search"
        @toggle-item="toggleSelection"
        @toggle-group="handleToggleGroup"
        @toggle-all="handleToggleGroup(contents.filter(i => i.movable !== false).map(i => i.id))"
      />

      <!-- Action bar -->
      <div
        v-if="selectedIds.size > 0"
        class="sticky bottom-0 flex items-center justify-between border-t border-(--ui-border) bg-(--ui-bg) px-4 py-3"
      >
        <span class="text-sm font-medium"> {{ selectedIds.size }} items selected </span>
        <div class="flex items-center gap-2">
          <UButton variant="outline" color="neutral" @click="showMoveDialog = true">
            Move to Another Storage
          </UButton>
          <UButton @click="handleRetrieve"> Move to Inventory </UButton>
        </div>
      </div>

      <UModal
        v-model:open="showMoveDialog"
        title="Move to Storage"
        :description="`Select a storage unit to move ${selectedIds.size} items into.`"
      >
        <template #body>
          <div v-if="otherStorageUnits.length > 0" class="flex flex-col gap-1">
            <button
              v-for="unit in otherStorageUnits"
              :key="unit.id"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-(--ui-bg-elevated)"
              @click="handleMoveToStorage(unit.id)"
            >
              <Archive class="h-4 w-4 shrink-0 text-(--ui-text-muted)" />
              <span class="flex-1 truncate text-left">{{ unit.custom_name || unit.name }}</span>
              <span class="text-xs text-(--ui-text-muted)">{{ unit.item_count }}/1000</span>
            </button>
          </div>
        </template>
      </UModal>
    </div>

    <RenameDialog
      :open="showRenameDialog"
      :current-name="unitName"
      @update:open="showRenameDialog = $event"
      @confirm="handleRename"
    />

    <OperationProgress
      :progress="store.operationProgress.value"
      :in-progress="store.operationInProgress.value"
    />
  </AppLayout>
</template>
