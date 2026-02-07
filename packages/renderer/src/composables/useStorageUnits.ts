import { ref, readonly } from 'vue';
import {
  steamInspectStorage,
  steamDepositToStorage,
  steamRetrieveFromStorage,
  steamRenameStorage,
  onSteamEvent,
} from '@app/preload';
import type { InventoryItem, OperationProgress } from '@/types/steam';
import { useToast } from '@/composables/useToast';

const storageContents = ref<Map<string, InventoryItem[]>>(new Map());
const operationProgress = ref<OperationProgress | null>(null);
const operationInProgress = ref(false);
const operationError = ref<string | null>(null);
const { error: showError } = useToast();

let listenersRegistered = false;

function registerListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  onSteamEvent('steam:operation-progress', (_event: unknown, data: OperationProgress) => {
    operationProgress.value = data;
  });

  onSteamEvent(
    'steam:operation-complete',
    (_event: unknown, data: { success: boolean; error?: string }) => {
      operationInProgress.value = false;
      if (!data.success && data.error) {
        operationError.value = data.error;
        showError(data.error);
      }
      operationProgress.value = null;
    },
  );
}

export function useStorageUnits() {
  registerListeners();

  async function inspectStorage(storageId: string) {
    const contents = await steamInspectStorage(storageId);
    const next = new Map(storageContents.value);
    next.set(storageId, contents);
    storageContents.value = next;
    return contents;
  }

  async function depositToStorage(storageId: string, itemIds: string[]) {
    operationInProgress.value = true;
    operationError.value = null;
    await steamDepositToStorage({ storageId, itemIds });
  }

  async function retrieveFromStorage(storageId: string, itemIds: string[]) {
    operationInProgress.value = true;
    operationError.value = null;
    await steamRetrieveFromStorage({ storageId, itemIds });
  }

  async function renameStorage(storageId: string, name: string) {
    await steamRenameStorage({ storageId, name });
  }

  function getContents(storageId: string): InventoryItem[] {
    return storageContents.value.get(storageId) ?? [];
  }

  return {
    storageContents: readonly(storageContents),
    operationProgress: readonly(operationProgress),
    operationInProgress: readonly(operationInProgress),
    operationError: readonly(operationError),
    inspectStorage,
    depositToStorage,
    retrieveFromStorage,
    renameStorage,
    getContents,
  };
}
