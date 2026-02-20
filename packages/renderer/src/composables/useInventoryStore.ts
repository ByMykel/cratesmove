import { ref, computed, readonly } from 'vue';
import {
  steamGetInventory,
  steamGetStorageUnits,
  steamInspectStorage,
  steamDepositToStorage,
  steamRetrieveFromStorage,
  steamRenameStorage,
  onSteamEvent,
} from '@app/preload';
import type {
  InventoryItem,
  StorageUnit,
  NormalizedItem,
  OperationProgress,
} from '@/types/steam';

const items = ref<Map<string, NormalizedItem>>(new Map());
const storageUnits = ref<Map<string, StorageUnit>>(new Map());
const loading = ref(false);
const operationProgress = ref<OperationProgress | null>(null);
const operationInProgress = ref(false);
const operationError = ref<string | null>(null);
// Tracks the target storage during a deposit so reconcileInventory can
// relocate items instead of losing them from the map.
let depositTarget: string | null = null;


const listenerCleanups: Array<() => void> = [];

function registerListeners() {
  if (listenerCleanups.length > 0) return;

  listenerCleanups.push(
    onSteamEvent('steam:inventory-updated', (_event: unknown, data: InventoryItem[]) => {
      reconcileInventory(data);
    }),

    onSteamEvent('steam:storage-units-updated', (_event: unknown, data: StorageUnit[]) => {
      const next = new Map<string, StorageUnit>();
      for (const unit of data) {
        next.set(unit.id, unit);
      }
      storageUnits.value = next;
    }),

    onSteamEvent('steam:operation-progress', (_event: unknown, data: OperationProgress) => {
      operationProgress.value = data;
    }),

    onSteamEvent(
      'steam:operation-complete',
      (_event: unknown, data: { success: boolean; error?: string }) => {
        operationInProgress.value = false;
        if (!data.success && data.error) {
          operationError.value = data.error;
        }
        operationProgress.value = null;
      },
    ),
  );
}

// Remove old IPC listeners before HMR replaces this module,
// preventing duplicate listeners from stacking up across edits.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const cleanup of listenerCleanups) cleanup();
    listenerCleanups.length = 0;
  });
}

function reconcileInventory(freshItems: InventoryItem[]) {
  const next = new Map(items.value);
  const freshIds = new Set(freshItems.map(i => i.id));

  for (const [id, item] of next) {
    if (item.location.type === 'inventory' && !freshIds.has(id)) {
      if (depositTarget) {
        // Item left inventory during a deposit — move it to the target storage
        // so inventory value drops but total stays stable.
        next.set(id, { ...item, location: { type: 'storage', storageId: depositTarget } });
      } else {
        next.delete(id);
      }
    }
  }

  // Add/update fresh inventory items
  for (const item of freshItems) {
    next.set(item.id, { ...item, location: { type: 'inventory' } });
  }

  items.value = next;
}

function reconcileStorageContents(storageId: string, freshItems: InventoryItem[]) {
  const next = new Map(items.value);

  // Remove all items currently located in this storage unit
  for (const [id, item] of next) {
    if (item.location.type === 'storage' && item.location.storageId === storageId) {
      next.delete(id);
    }
  }

  // Add fresh storage items
  for (const item of freshItems) {
    next.set(item.id, { ...item, location: { type: 'storage', storageId } });
  }

  items.value = next;
}

// Derived state
const inventoryItems = computed(() => {
  const result: NormalizedItem[] = [];
  for (const item of items.value.values()) {
    if (item.location.type === 'inventory') {
      result.push(item);
    }
  }
  return result;
});

const storageUnitList = computed(() =>
  Array.from(storageUnits.value.values()).sort((a, b) => a.name.localeCompare(b.name)),
);

const allItems = computed(() => Array.from(items.value.values()));

function getStorageContents(storageId: string): NormalizedItem[] {
  const result: NormalizedItem[] = [];
  for (const item of items.value.values()) {
    if (item.location.type === 'storage' && item.location.storageId === storageId) {
      result.push(item);
    }
  }
  return result;
}

function reset() {
  items.value = new Map();
  storageUnits.value = new Map();
  loading.value = false;
  operationProgress.value = null;
  operationInProgress.value = false;
  operationError.value = null;
  depositTarget = null;
}

// Actions
async function fetchInventory() {
  loading.value = true;
  try {
    const result = await steamGetInventory();
    reconcileInventory(result);
  } finally {
    loading.value = false;
  }
}

async function fetchStorageUnits() {
  const result = await steamGetStorageUnits();
  const next = new Map<string, StorageUnit>();
  for (const unit of result) {
    next.set(unit.id, unit);
  }
  storageUnits.value = next;
}

async function refreshAll() {
  await Promise.all([fetchInventory(), fetchStorageUnits()]);
}

async function inspectStorage(storageId: string) {
  const contents = await steamInspectStorage(storageId);
  reconcileStorageContents(storageId, contents);
  return contents;
}

async function depositToStorage(storageId: string, itemIds: string[]) {
  operationInProgress.value = true;
  operationError.value = null;
  depositTarget = storageId;
  await steamDepositToStorage({ storageId, itemIds });
  depositTarget = null;
}

async function retrieveFromStorage(storageId: string, itemIds: string[]) {
  operationInProgress.value = true;
  operationError.value = null;
  await steamRetrieveFromStorage({ storageId, itemIds });
}

async function renameStorage(storageId: string, name: string) {
  await steamRenameStorage({ storageId, name });
}

export function useInventoryStore() {
  registerListeners();

  return {
    items,
    storageUnits,
    loading: readonly(loading),
    operationProgress: readonly(operationProgress),
    operationInProgress: readonly(operationInProgress),
    operationError: readonly(operationError),
    inventoryItems,
    storageUnitList,
    allItems,
    getStorageContents,
    reset,
    fetchInventory,
    fetchStorageUnits,
    refreshAll,
    inspectStorage,
    depositToStorage,
    retrieveFromStorage,
    renameStorage,
  };
}
