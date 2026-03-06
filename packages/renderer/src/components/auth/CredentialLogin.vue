<script setup lang="ts">
import { ref } from 'vue';
import { useSteam } from '@/composables/useSteam';
import { Loader2, ShieldCheck } from 'lucide-vue-next';

const { authState, credentialLogin, submitSteamGuard, steamGuardType } = useSteam();

const username = ref('');
const password = ref('');
const steamGuardCode = ref<string[]>([]);

async function handleLogin() {
  if (!username.value || !password.value) return;
  await credentialLogin(username.value, password.value);
}

async function handleSteamGuard() {
  const code = (steamGuardCode.value ?? []).join('');
  if (code.length < 5) return;
  await submitSteamGuard(code);
}

function onPinComplete(value: string[]) {
  steamGuardCode.value = value;
  handleSteamGuard();
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

    <UPinInput
      v-model="steamGuardCode"
      :length="5"
      otp
      autofocus
      :ui="{ root: 'justify-center' }"
      @complete="onPinComplete"
    />

    <UButton type="submit" :disabled="(steamGuardCode ?? []).join('').length < 5" block>
      Verify
    </UButton>
  </form>

  <!-- Login Form -->
  <form v-else class="flex flex-col gap-4" @submit.prevent="handleLogin">
    <p class="text-sm font-medium text-(--ui-text-muted)">Sign in with Steam</p>

    <div class="flex flex-col gap-3">
      <UInput
        v-model="username"
        placeholder="Username"
        autocomplete="username"
        :disabled="authState === 'connecting'"
      />
      <UInput
        v-model="password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
        :disabled="authState === 'connecting'"
      />
    </div>

    <UButton type="submit" :disabled="!username || !password || authState === 'connecting'" block>
      <Loader2 v-if="authState === 'connecting'" class="h-4 w-4 animate-spin" />
      <span v-else>Sign In</span>
    </UButton>
  </form>
</template>
