<script setup lang="ts">
import { ref } from 'vue';
import { useSteam } from '@/composables/useSteam';
import { Loader2, ShieldCheck } from 'lucide-vue-next';

const { authState, error, credentialLogin, submitSteamGuard, steamGuardType } = useSteam();

const username = ref('');
const password = ref('');
const steamGuardCode = ref('');

const ERROR_MESSAGES: Record<string, string> = {
  InvalidPassword: 'Incorrect password. Please try again.',
  InvalidLoginAuthCode: 'Invalid Steam Guard code. Please try again.',
  TwoFactorCodeMismatch: 'Invalid authenticator code. Please try again.',
  RateLimitExceeded: 'Too many attempts. Please wait and try again.',
  AccountDisabled: 'This account has been disabled.',
  AccountLoginDeniedNeedTwoFactor: 'Steam Guard authentication required.',
  Timeout: 'Connection timed out. Please try again.',
};

function friendlyError(raw: string | null): string {
  if (!raw) return '';
  return ERROR_MESSAGES[raw] ?? raw;
}

async function handleLogin() {
  if (!username.value || !password.value) return;
  await credentialLogin(username.value, password.value);
}

async function handleSteamGuard() {
  if (!steamGuardCode.value) return;
  await submitSteamGuard(steamGuardCode.value);
}
</script>

<template>
  <!-- Steam Guard Code Form -->
  <form
    v-if="authState === 'waiting-for-steam-guard'"
    class="flex flex-col gap-4"
    @submit.prevent="handleSteamGuard"
  >
    <div class="flex flex-col items-center gap-2 text-center">
      <div class="flex items-center justify-center rounded-xl bg-(--ui-primary)/10 p-2.5">
        <ShieldCheck class="h-6 w-6 text-(--ui-primary)" />
      </div>
      <p class="text-sm font-semibold">Steam Guard</p>
      <p class="text-xs text-(--ui-text-muted)">
        Enter the code sent to your
        {{ steamGuardType === 'email' ? 'email' : 'authenticator' }}
      </p>
    </div>

    <UInput
      v-model="steamGuardCode"
      placeholder="X X X X X"
      class="text-center text-lg tracking-[0.3em]"
      :maxlength="5"
      autofocus
    />

    <UButton type="submit" :disabled="!steamGuardCode" block> Verify </UButton>
  </form>

  <!-- Login Form -->
  <form v-else class="flex flex-col gap-4" @submit.prevent="handleLogin">
    <p class="text-sm font-medium text-(--ui-text-muted)">Sign in with Steam</p>

    <div class="flex flex-col gap-3">
      <UInput v-model="username" placeholder="Username" autocomplete="username" />
      <UInput
        v-model="password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
      />
    </div>

    <div v-if="error" class="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-500">
      {{ friendlyError(error) }}
    </div>

    <UButton type="submit" :disabled="!username || !password || authState === 'connecting'" block>
      <Loader2 v-if="authState === 'connecting'" class="h-4 w-4 animate-spin" />
      <span v-else>Sign In</span>
    </UButton>
  </form>
</template>
