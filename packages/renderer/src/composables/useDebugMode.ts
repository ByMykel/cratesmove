import { ref, readonly, onMounted, onUnmounted } from 'vue';

const enabled = ref(false);

function toggle() {
  enabled.value = !enabled.value;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    toggle();
  }
}

let listenerCount = 0;

export function useDebugMode() {
  onMounted(() => {
    if (listenerCount === 0) {
      window.addEventListener('keydown', handleKeydown);
    }
    listenerCount++;
  });

  onUnmounted(() => {
    listenerCount--;
    if (listenerCount === 0) {
      window.removeEventListener('keydown', handleKeydown);
    }
  });

  return {
    debugEnabled: readonly(enabled),
    toggleDebug: toggle,
  };
}
