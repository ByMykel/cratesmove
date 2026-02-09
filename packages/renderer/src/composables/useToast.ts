import { ref, readonly } from 'vue';

export interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

function addToast(message: string, type: Toast['type'] = 'info', duration = 5000) {
  const id = nextId++;
  toasts.value = [...toasts.value, { id, message, type }];
  setTimeout(() => removeToast(id), duration);
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    error: (message: string) => addToast(message, 'error'),
    success: (message: string) => addToast(message, 'success'),
    info: (message: string) => addToast(message, 'info'),
    remove: removeToast,
  };
}
