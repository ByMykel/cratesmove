<script setup lang="ts">
import {useSteam} from '@/composables/useSteam';
import {useToast} from '@/composables/useToast';
import ToastContainer from '@/components/ToastContainer.vue';
import {watch, onMounted} from 'vue';
import {useRouter} from 'vue-router';
import {onSteamEvent} from '@app/preload';

const {isConnected, trySavedSession} = useSteam();
const {error: showError} = useToast();
const router = useRouter();

onSteamEvent('steam:error', (_event: unknown, data: {message: string}) => {
  showError(data.message);
});

// Auth guard
router.beforeEach(to => {
  if (to.meta.requiresAuth && !isConnected.value) {
    return '/login';
  }
  if (to.path === '/login' && isConnected.value) {
    return '/inventory';
  }
});

// Redirect on connection state change
watch(isConnected, connected => {
  if (connected) {
    router.push('/inventory');
  } else {
    router.push('/login');
  }
});

// Try to restore saved session on startup
onMounted(() => {
  trySavedSession();
});
</script>

<template>
  <router-view />
  <ToastContainer />
</template>
