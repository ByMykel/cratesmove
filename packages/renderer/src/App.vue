<script setup lang="ts">
import {useSteam} from '@/composables/useSteam';
import {watch, onMounted} from 'vue';
import {useRouter} from 'vue-router';

const {isConnected, trySavedSession} = useSteam();
const router = useRouter();

// Auth guard
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isConnected.value) {
    return '/login';
  }
  if (to.path === '/login' && isConnected.value) {
    return '/inventory';
  }
});

// Redirect on connection state change
watch(isConnected, (connected) => {
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
</template>
