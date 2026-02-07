import { ref, computed } from 'vue';

export function useSelection() {
  const selectedIds = ref<Set<string>>(new Set());

  const selectionCount = computed(() => selectedIds.value.size);

  function toggle(id: string) {
    const next = new Set(selectedIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedIds.value = next;
  }

  function toggleBatch(ids: string[]) {
    const next = new Set(selectedIds.value);
    const allSelected = ids.every(id => next.has(id));
    if (allSelected) {
      for (const id of ids) next.delete(id);
    } else {
      for (const id of ids) next.add(id);
    }
    selectedIds.value = next;
  }

  function selectAll(ids: string[]) {
    selectedIds.value = new Set(ids);
  }

  function clear() {
    selectedIds.value = new Set();
  }

  return {
    selectedIds,
    selectionCount,
    toggle,
    toggleBatch,
    selectAll,
    clear,
  };
}
