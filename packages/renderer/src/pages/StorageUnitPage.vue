<script setup lang="ts">
import {onMounted, ref, computed} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import ItemGrid from '@/components/ItemGrid.vue';
import MoveItemsDialog from '@/components/MoveItemsDialog.vue';
import RenameDialog from '@/components/RenameDialog.vue';
import OperationProgress from '@/components/OperationProgress.vue';
import {useInventory} from '@/composables/useInventory';
import {useStorageUnits} from '@/composables/useStorageUnits';
import {ArrowLeft, Plus, Pencil, ArrowUpFromLine, Loader2} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const storageId = computed(() => route.params.id as string);

const {items, storageUnits, fetchInventory, fetchStorageUnits} = useInventory();
const {
  inspectStorage,
  depositToStorage,
  retrieveFromStorage,
  renameStorage,
  getContents,
  operationProgress,
  operationInProgress,
} = useStorageUnits();

const loading = ref(false);
const selectedIds = ref<Set<string>>(new Set());
const showAddDialog = ref(false);
const showRenameDialog = ref(false);

const contents = computed(() => getContents(storageId.value));
const currentUnit = computed(() => storageUnits.value.find(u => u.id === storageId.value));
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

function toggleSelection(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
}

async function handleRetrieve() {
  const itemIds = [...selectedIds.value];
  selectedIds.value = new Set();
  await retrieveFromStorage(storageId.value, itemIds);
  await refresh();
}

async function handleDeposit(itemIds: string[]) {
  showAddDialog.value = false;
  await depositToStorage(storageId.value, itemIds);
  await refresh();
}

async function handleRename(name: string) {
  await renameStorage(storageId.value, name);
  await fetchStorageUnits();
}

async function refresh() {
  await Promise.all([inspectStorage(storageId.value), fetchInventory(), fetchStorageUnits()]);
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
          <p class="text-xs text-(--ui-text-muted)">{{ contents.length }} items</p>
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

      <ItemGrid
        v-else
        :items="contents"
        :selected-ids="selectedIds"
        @toggle-item="toggleSelection"
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
