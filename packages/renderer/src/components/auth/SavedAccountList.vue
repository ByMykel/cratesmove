<script setup lang="ts">
import { ref } from 'vue';
import { useSteam } from '@/composables/useSteam';
import { Loader2, X } from 'lucide-vue-next';

const { savedAccounts, switchingAccount, switchAccount, removeAccount } = useSteam();

const switchingId = ref<string | null>(null);

async function handleSwitch(steamId: string) {
  switchingId.value = steamId;
  await switchAccount(steamId);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm font-medium text-(--ui-text-muted)">Choose an account</p>

    <div class="flex flex-col gap-2">
      <div
        v-for="account in savedAccounts"
        :key="account.steamId"
        class="group flex items-center gap-3 rounded-xl border border-(--ui-border) bg-(--ui-bg) px-3 py-3 transition-all duration-150"
        :class="
          switchingAccount
            ? 'pointer-events-none opacity-50'
            : 'cursor-pointer hover:border-(--ui-primary)/30 hover:bg-(--ui-bg-elevated) hover:shadow-sm'
        "
        @click="!switchingAccount && handleSwitch(account.steamId)"
      >
        <div class="relative h-10 w-10 shrink-0">
          <img
            v-if="account.avatarUrl"
            :src="account.avatarUrl"
            class="h-10 w-10 rounded-lg ring-1 ring-(--ui-border)"
            alt="avatar"
          />
          <div
            v-else
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-(--ui-bg-elevated) text-xs font-medium text-(--ui-text-muted)"
          >
            {{ account.personaName.charAt(0).toUpperCase() }}
          </div>

          <!-- Spinner overlay -->
          <div
            v-if="switchingId === account.steamId && switchingAccount"
            class="absolute inset-0 flex items-center justify-center rounded-lg bg-(--ui-bg)/80"
          >
            <Loader2 class="h-5 w-5 animate-spin text-(--ui-primary)" />
          </div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-medium">{{ account.personaName }}</span>
          <span class="truncate text-xs text-(--ui-text-muted)">{{ account.steamId }}</span>
        </div>

        <UButton
          v-if="!switchingAccount"
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
