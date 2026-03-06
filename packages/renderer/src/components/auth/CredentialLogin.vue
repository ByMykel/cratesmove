<script setup lang="ts">
import { ref } from 'vue';
import { useSteam } from '@/composables/useSteam';
import { ShieldCheck } from 'lucide-vue-next';

const { authState, credentialLogin, submitSteamGuard, steamGuardType } = useSteam();

const authFormRef = ref<{ state: Record<string, string> }>();
const steamGuardCode = ref<string[]>([]);

const loginFields = [
  {
    name: 'username',
    type: 'text' as const,
    label: 'Username',
    placeholder: 'Username',
    autocomplete: 'username',
    required: true,
  },
  {
    name: 'password',
    type: 'password' as const,
    label: 'Password',
    placeholder: 'Password',
    autocomplete: 'current-password',
    required: true,
  },
];

async function handleLogin(payload: { data: { username: string; password: string } }) {
  await credentialLogin(payload.data.username, payload.data.password);
}

async function handleSteamGuard() {
  const code = (steamGuardCode.value ?? []).join('');
  if (code.length < 5) return;
  await submitSteamGuard(code);
}

function onPinComplete(value: string[]) {
  steamGuardCode.value = value;
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
  <UAuthForm
    v-else
    ref="authFormRef"
    :fields="loginFields"
    :loading="authState === 'connecting'"
    :disabled="authState === 'connecting'"
    :submit="{
      label: 'Sign In',
      disabled: !authFormRef?.state?.username || !authFormRef?.state?.password,
    }"
    @submit="handleLogin"
  />
</template>
