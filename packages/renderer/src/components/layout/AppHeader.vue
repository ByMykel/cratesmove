<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSteam } from '@/composables/useSteam';
import { useUpdater } from '@/composables/useUpdater';
import { Package, ChevronDown, Download, Loader2 } from 'lucide-vue-next';
import { useTheme } from '@/composables/useTheme';
import { useSettings } from '@/composables/useSettings';

const { userInfo, savedAccounts, logout, switchAccount, switchingAccount } = useSteam();
const { updateDownloaded, updateVersion, downloadProgress, updateAvailable, installUpdate } =
  useUpdater();
const { preference, resolvedTheme } = useTheme();
const { priceSource } = useSettings();
const router = useRouter();

const themeIcon = computed(() =>
  resolvedTheme.value === 'light' ? 'i-lucide-sun' : 'i-lucide-moon',
);

const otherAccounts = computed(() =>
  savedAccounts.value.filter(a => a.steamId !== userInfo.value?.steamId),
);

interface DropdownItem {
  type?: 'label';
  label: string;
  icon?: string;
  avatar?: { src: string; alt: string };
  ui?: Record<string, string>;
  color?: 'error';
  disabled?: boolean;
  active?: boolean;
  children?: DropdownItem[];
  onSelect?: () => void;
}

const iconUi = { itemLeadingIcon: 'size-4', itemLeadingAvatar: 'rounded-lg' };

const isDownloading = computed(
  () => updateAvailable.value && !updateDownloaded.value && downloadProgress.value > 0,
);

const dropdownItems = computed(() => {
  const items: DropdownItem[][] = [];

  // Accounts group
  items.push([
    { type: 'label', label: 'Accounts' },
    ...otherAccounts.value.map(account => ({
      label: account.personaName,
      avatar: account.avatarUrl ? { src: account.avatarUrl, alt: account.personaName } : undefined,
      ui: iconUi,
      onSelect: () => switchAccount(account.steamId),
    })),
    {
      label: 'Add account',
      icon: 'i-lucide-user-plus',
      ui: iconUi,
      onSelect: () => router.push('/login?addAccount=true'),
    },
  ]);

  // Appearance + price source group
  items.push([
    {
      label: 'Appearance',
      icon: themeIcon.value,
      ui: { ...iconUi, itemTrailingIcon: 'size-3.5 text-(--ui-text-dimmed)', content: 'min-w-32' },
      children: [
        {
          label: 'Light',
          icon: 'i-lucide-sun',
          ui: iconUi,
          active: preference.value === 'light',
          onSelect: () => {
            preference.value = 'light';
          },
        },
        {
          label: 'Dark',
          icon: 'i-lucide-moon',
          ui: iconUi,
          active: preference.value === 'dark',
          onSelect: () => {
            preference.value = 'dark';
          },
        },
        {
          label: 'System',
          icon: 'i-lucide-monitor',
          ui: iconUi,
          active: preference.value === 'system',
          onSelect: () => {
            preference.value = 'system';
          },
        },
      ],
    },
    {
      label: 'Price Source',
      icon: 'i-lucide-dollar-sign',
      ui: { ...iconUi, itemTrailingIcon: 'size-3.5 text-(--ui-text-dimmed)', content: 'min-w-32' },
      children: [
        {
          label: 'Steam',
          active: priceSource.value === 'steam',
          onSelect: () => {
            priceSource.value = 'steam';
          },
        },
        {
          label: 'CSFloat',
          active: priceSource.value === 'csfloat',
          onSelect: () => {
            priceSource.value = 'csfloat';
          },
        },
      ],
    },
  ]);

  // Sign out group
  items.push([
    {
      label: 'Sign out',
      icon: 'i-lucide-log-out',
      color: 'error' as const,
      ui: iconUi,
      onSelect: () => logout(),
    },
  ]);

  return items;
});
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-(--ui-border) px-4">
    <div class="flex items-center gap-3">
      <Package class="h-6 w-6 text-(--ui-primary)" />
      <h1 class="text-lg font-semibold">cratesmove</h1>
    </div>

    <div class="flex items-center gap-2">
      <UButton
        v-if="updateDownloaded"
        variant="soft"
        size="xs"
        class="gap-1.5"
        @click="installUpdate()"
      >
        <Download class="h-3.5 w-3.5" />
        Update to v{{ updateVersion }}
      </UButton>
      <UButton v-else-if="isDownloading" variant="soft" size="xs" class="gap-1.5" disabled>
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
        {{ downloadProgress }}%
      </UButton>

      <UDropdownMenu
        v-if="userInfo"
        :items="dropdownItems"
        :ui="{ item: 'items-center', content: 'min-w-48' }"
      >
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          class="gap-2 text-(--ui-text-muted) hover:text-(--ui-text)"
          :disabled="switchingAccount"
        >
          <img
            v-if="userInfo.avatarUrl"
            :src="userInfo.avatarUrl"
            class="h-6 w-6 rounded-lg ring-1 ring-(--ui-border)"
            alt="avatar"
          />
          <span class="text-sm">{{ userInfo.personaName }}</span>
          <ChevronDown class="h-3.5 w-3.5" />
        </UButton>
      </UDropdownMenu>
    </div>
  </header>
</template>
