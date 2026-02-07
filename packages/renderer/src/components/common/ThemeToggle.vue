<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';
import { Sun, Moon } from 'lucide-vue-next';

const { preference, resolvedTheme } = useTheme();

const iconUi = { itemLeadingIcon: 'size-4' };

const options = [
  { label: 'Light', value: 'light' as const, icon: 'i-lucide-sun' },
  { label: 'Dark', value: 'dark' as const, icon: 'i-lucide-moon' },
  { label: 'System', value: 'system' as const, icon: 'i-lucide-monitor' },
];
</script>

<template>
  <UDropdownMenu
    :items="
      options.map(o => ({
        label: o.label,
        icon: o.icon,
        ui: iconUi,
        active: preference === o.value,
        onSelect: () => {
          preference = o.value;
        },
      }))
    "
  >
    <UButton
      variant="ghost"
      color="neutral"
      square
      size="sm"
      class="text-(--ui-text-muted) hover:text-(--ui-text)"
    >
      <Sun v-if="resolvedTheme === 'light'" class="h-4 w-4" />
      <Moon v-else class="h-4 w-4" />
    </UButton>
  </UDropdownMenu>
</template>
