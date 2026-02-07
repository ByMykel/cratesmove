<script setup lang="ts">
import {useTheme} from '@/composables/useTheme';
import {Sun, Moon, Monitor} from 'lucide-vue-next';

const {preference, resolvedTheme} = useTheme();

const options = [
  {label: 'Light', value: 'light' as const, icon: 'i-lucide-sun'},
  {label: 'Dark', value: 'dark' as const, icon: 'i-lucide-moon'},
  {label: 'System', value: 'system' as const, icon: 'i-lucide-monitor'},
];
</script>

<template>
  <UDropdownMenu
    :items="options.map(o => ({
      label: o.label,
      icon: o.icon,
      active: preference === o.value,
      onSelect: () => { preference = o.value },
    }))"
  >
    <UButton
      variant="ghost"
      color="neutral"
      square
      size="xs"
      class="text-(--ui-text-muted) hover:text-(--ui-text)"
    >
      <Sun v-if="resolvedTheme === 'light'" class="h-3.5 w-3.5" />
      <Moon v-else class="h-3.5 w-3.5" />
    </UButton>
  </UDropdownMenu>
</template>
