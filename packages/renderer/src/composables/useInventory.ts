import {ref, computed, readonly} from 'vue';
import {steamGetInventory, steamGetStorageUnits, onSteamEvent} from '@app/preload';
import type {InventoryItem, StorageUnit} from '@/types/steam';

const items = ref<InventoryItem[]>([]);
const storageUnits = ref<StorageUnit[]>([]);
const selectedItemIds = ref<Set<string>>(new Set());
const loading = ref(false);
const rawItemsMap = new Map<string, any>();

let listenersRegistered = false;

function registerListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  onSteamEvent('steam:inventory-updated', (_event: unknown, data: InventoryItem[]) => {
    items.value = data;
  });

  onSteamEvent('steam:storage-units-updated', (_event: unknown, data: StorageUnit[]) => {
    storageUnits.value = data;
  });

  onSteamEvent('steam:debug-raw-inventory', (_event: unknown, data: any[]) => {
    rawItemsMap.clear();
    for (const item of data) {
      rawItemsMap.set(String(item.id), item);
    }
  });
}

export function useInventory() {
  registerListeners();

  const selectedItems = computed(() =>
    items.value.filter(item => selectedItemIds.value.has(item.id)),
  );

  const selectionCount = computed(() => selectedItemIds.value.size);

  async function fetchInventory() {
    loading.value = true;
    try {
      const result = await steamGetInventory();
      items.value = result;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStorageUnits() {
    const result = await steamGetStorageUnits();
    storageUnits.value = result;
  }

  function toggleSelection(itemId: string) {
    const next = new Set(selectedItemIds.value);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    selectedItemIds.value = next;
  }

  function selectAll() {
    selectedItemIds.value = new Set(items.value.map(i => i.id));
  }

  function clearSelection() {
    selectedItemIds.value = new Set();
  }

  function getRawItem(id: string): any | undefined {
    return rawItemsMap.get(id);
  }

  return {
    items: readonly(items),
    storageUnits: readonly(storageUnits),
    selectedItemIds: readonly(selectedItemIds),
    selectedItems,
    selectionCount,
    loading: readonly(loading),
    fetchInventory,
    fetchStorageUnits,
    toggleSelection,
    selectAll,
    clearSelection,
    getRawItem,
  };
}
