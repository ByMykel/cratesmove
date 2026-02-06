<script setup lang="ts">
import {ref} from 'vue';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useSteam} from '@/composables/useSteam';
import {Loader2} from 'lucide-vue-next';

const {authState, error, credentialLogin, submitSteamGuard, steamGuardType} = useSteam();

const username = ref('');
const password = ref('');
const steamGuardCode = ref('');

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
    <p class="text-sm text-muted-foreground">
      Enter the Steam Guard code sent to your
      {{ steamGuardType === 'email' ? 'email' : 'authenticator' }}
    </p>

    <Input
      v-model="steamGuardCode"
      placeholder="Steam Guard code"
      class="text-center text-lg tracking-widest"
      maxlength="5"
      autofocus
    />

    <Button type="submit" :disabled="!steamGuardCode">
      Verify
    </Button>
  </form>

  <!-- Login Form -->
  <form
    v-else
    class="flex flex-col gap-4"
    @submit.prevent="handleLogin"
  >
    <div class="flex flex-col gap-2">
      <Input
        v-model="username"
        placeholder="Username"
        autocomplete="username"
      />
      <Input
        v-model="password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
      />
    </div>

    <p
      v-if="error"
      class="text-sm text-destructive-foreground"
    >
      {{ error }}
    </p>

    <Button
      type="submit"
      :disabled="!username || !password || authState === 'connecting'"
    >
      <Loader2
        v-if="authState === 'connecting'"
        class="h-4 w-4 animate-spin"
      />
      <span v-else>Sign In</span>
    </Button>
  </form>
</template>
