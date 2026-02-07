<script setup lang="ts">
import {useSteam} from '@/composables/useSteam';
import {Loader2, X} from 'lucide-vue-next';

const {savedAccounts, switchingAccount, switchAccount, removeAccount} = useSteam();
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm text-(--ui-text-muted)">Choose an account</p>

    <div v-if="switchingAccount" class="flex flex-col items-center gap-3 py-4">
      <Loader2 class="h-8 w-8 animate-spin text-(--ui-text-muted)" />
      <p class="text-sm text-(--ui-text-muted)">Switching account...</p>
    </div>

    <div v-else class="flex flex-col gap-1">
      <div
        v-for="account in savedAccounts"
        :key="account.steamId"
        class="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-(--ui-bg-elevated)"
        @click="switchAccount(account.steamId)"
      >
        <img
          v-if="account.avatarUrl"
          :src="account.avatarUrl"
          class="h-8 w-8 rounded-full ring-1 ring-(--ui-border)"
          alt="avatar"
        />
        <div
          v-else
          class="flex h-8 w-8 items-center justify-center rounded-full bg-(--ui-bg-elevated) text-xs font-medium text-(--ui-text-muted)"
        >
          {{ account.personaName.charAt(0).toUpperCase() }}
        </div>

        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-medium">{{ account.personaName }}</span>
          <span class="truncate text-xs text-(--ui-text-muted)">{{ account.steamId }}</span>
        </div>

        <UButton
          variant="ghost"
          color="neutral"
          square
          size="xs"
          class="opacity-0 transition-opacity group-hover:opacity-100"
          @click.stop="removeAccount(account.steamId)"
        >
          <X class="h-3.5 w-3.5" />
        </UButton>
      </div>
    </div>
  </div>
</template>
