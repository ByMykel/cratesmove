import { ref, readonly } from 'vue';
import { steamGetInventory, steamGetStorageUnits, onSteamEvent } from '@app/preload';
import type { InventoryItem, StorageUnit } from '@/types/steam';

const items = ref<InventoryItem[]>([]);
const storageUnits = ref<StorageUnit[]>([]);
const loading = ref(false);

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
}

export function useInventory() {
  registerListeners();

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

  async function refreshAll() {
    await Promise.all([fetchInventory(), fetchStorageUnits()]);
  }

  return {
    items: readonly(items),
    storageUnits: readonly(storageUnits),
    loading: readonly(loading),
    fetchInventory,
    fetchStorageUnits,
    refreshAll,
  };
}
