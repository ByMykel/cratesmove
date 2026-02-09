<script setup lang="ts">
import { useSteam } from '@/composables/useSteam';
import { useToast } from '@/composables/useToast';
import ToastContainer from '@/components/common/ToastContainer.vue';
import { watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { onSteamEvent } from '@app/preload';

const { isConnected, switchingAccount, savedAccounts, trySavedSession, getSavedAccounts } =
  useSteam();
const { error: showError } = useToast();
const router = useRouter();

onSteamEvent('steam:error', (_event: unknown, data: { message: string }) => {
  showError(data.message);
});

// Auth guard
router.beforeEach(to => {
  const addingAccount = to.query.addAccount === 'true';

  if (to.meta.requiresAuth && !isConnected.value) {
    return '/login';
  }
  if (to.path === '/login' && isConnected.value && !addingAccount) {
    return '/inventory';
  }
});

// Redirect on connection state change
watch(isConnected, connected => {
  if (connected) {
    router.push('/inventory');
  } else if (!connected && !switchingAccount.value) {
    router.push('/login');
  }
});

// Load saved accounts and auto-login only if there's exactly one
onMounted(async () => {
  await getSavedAccounts();
  if (savedAccounts.value.length === 1) {
    trySavedSession();
  }
});
</script>

<template>
  <UApp>
    <router-view />
    <ToastContainer />
  </UApp>
</template>
