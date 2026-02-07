<script setup lang="ts">
import {computed} from 'vue';
import {useRouter} from 'vue-router';
import {useSteam} from '@/composables/useSteam';
import {Package, ChevronDown} from 'lucide-vue-next';
import ThemeToggle from '@/components/ThemeToggle.vue';

const {userInfo, savedAccounts, logout, switchAccount} = useSteam();
const router = useRouter();

const otherAccounts = computed(() =>
  savedAccounts.value.filter(a => a.steamId !== userInfo.value?.steamId),
);

const iconUi = {itemLeadingIcon: 'size-4'};

const dropdownItems = computed(() => {
  const items: any[][] = [];

  // Accounts group
  items.push([
    {type: 'label', label: 'Accounts'},
    ...otherAccounts.value.map(account => ({
      label: account.personaName,
      avatar: account.avatarUrl ? {src: account.avatarUrl, alt: account.personaName} : undefined,
      onSelect: () => switchAccount(account.steamId),
    })),
    {
      label: 'Add account',
      icon: 'i-lucide-user-plus',
      ui: iconUi,
      onSelect: () => router.push('/login?addAccount=true'),
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

    <div class="flex items-center gap-3">
      <ThemeToggle />

      <UDropdownMenu v-if="userInfo" :items="dropdownItems">
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          class="gap-2 text-(--ui-text-muted) hover:text-(--ui-text)"
        >
          <img
            v-if="userInfo.avatarUrl"
            :src="userInfo.avatarUrl"
            class="h-6 w-6 rounded-full ring-1 ring-(--ui-border)"
            alt="avatar"
          />
          <span class="text-sm">{{ userInfo.personaName }}</span>
          <ChevronDown class="h-3.5 w-3.5" />
        </UButton>
      </UDropdownMenu>
    </div>
  </header>
</template>
