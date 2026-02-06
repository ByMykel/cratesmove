<script setup lang="ts">
import type {AuthState} from '@/types/steam';

const props = defineProps<{
  state: AuthState;
}>();

const statusMap: Record<AuthState, {color: string; label: string}> = {
  disconnected: {color: 'bg-red-500', label: 'Disconnected'},
  connecting: {color: 'bg-yellow-500', label: 'Connecting'},
  'waiting-for-steam-guard': {color: 'bg-yellow-500', label: 'Steam Guard'},
  connected: {color: 'bg-green-500', label: 'Connected'},
  error: {color: 'bg-red-500', label: 'Error'},
};
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="h-2.5 w-2.5 rounded-full"
      :class="statusMap[state].color"
    />
    <span class="text-xs text-muted-foreground">{{ statusMap[state].label }}</span>
  </div>
</template>
