<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSteam } from '@/composables/useSteam';
import { ExternalLink } from 'lucide-vue-next';

const { authState, webtokenLogin } = useSteam();

const tokenJson = ref('');

const TOKEN_URL = 'https://steamcommunity.com/chat/clientjstoken';

const isValid = computed(() => {
  const trimmed = tokenJson.value.trim();
  if (!trimmed) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return Boolean(parsed.account_name && parsed.token && parsed.steamid);
  } catch {
    return false;
  }
});

async function handleSubmit() {
  if (!isValid.value) return;
  await webtokenLogin(tokenJson.value.trim());
}

function openTokenUrl() {
  window.open(TOKEN_URL, '_blank', 'noopener');
}
</script>

<template>
  <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
    <div class="flex flex-col gap-1">
      <p class="text-sm font-semibold">Sign in with browser token</p>
      <p class="text-xs text-(--ui-text-muted)">
        Open the Steam community page below while signed in, then paste the JSON response here.
      </p>
    </div>

    <UButton
      variant="outline"
      color="neutral"
      block
      :icon="ExternalLink as unknown as string"
      @click="openTokenUrl"
    >
      Open token page
    </UButton>

    <UTextarea
      v-model="tokenJson"
      placeholder='{"logged_in":true,"steamid":"...","accountid":...,"account_name":"...","token":"..."}'
      :rows="5"
      :disabled="authState === 'connecting'"
      autoresize
      class="font-mono"
    />

    <UButton
      type="submit"
      block
      :loading="authState === 'connecting'"
      :disabled="!isValid || authState === 'connecting'"
    >
      Sign In
    </UButton>

    <p class="text-xs text-(--ui-text-dimmed)">
      Note: token is single-use, so you'll need to fetch it again next time.
    </p>
  </form>
</template>
