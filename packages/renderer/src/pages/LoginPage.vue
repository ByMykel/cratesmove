<script setup lang="ts">
import CredentialLogin from '@/components/CredentialLogin.vue';
import {Package, Loader2} from 'lucide-vue-next';
import {useSteam} from '@/composables/useSteam';

const {error, restoringSession} = useSteam();
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-(--ui-bg) p-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex flex-col items-center text-center">
          <Package class="mb-2 h-10 w-10 text-(--ui-primary)" />
          <h2 class="text-2xl font-semibold">cratesmove</h2>
          <p class="text-sm text-(--ui-text-muted)">Sign in with your Steam account</p>
        </div>
      </template>

      <!-- Restoring saved session -->
      <div v-if="restoringSession" class="flex flex-col items-center gap-3 py-8">
        <Loader2 class="h-8 w-8 animate-spin text-(--ui-text-muted)" />
        <p class="text-sm text-(--ui-text-muted)">Restoring session...</p>
      </div>

      <!-- Credential login form -->
      <CredentialLogin v-else />

      <p v-if="error && !restoringSession" class="mt-4 text-center text-sm text-red-500">
        {{ error }}
      </p>
    </UCard>
  </div>
</template>
