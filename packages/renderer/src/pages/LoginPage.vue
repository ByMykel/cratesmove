<script setup lang="ts">
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import CredentialLogin from '@/components/CredentialLogin.vue';
import {Package, Loader2} from 'lucide-vue-next';
import {useSteam} from '@/composables/useSteam';

const {error, restoringSession} = useSteam();
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md">
      <CardHeader class="items-center text-center">
        <Package class="mb-2 h-10 w-10 text-primary" />
        <CardTitle class="text-2xl">CratesMove</CardTitle>
        <p class="text-sm text-muted-foreground">
          Sign in with your Steam account
        </p>
      </CardHeader>

      <CardContent>
        <!-- Restoring saved session -->
        <div
          v-if="restoringSession"
          class="flex flex-col items-center gap-3 py-8"
        >
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Restoring session...</p>
        </div>

        <!-- Credential login form -->
        <CredentialLogin v-else />

        <p
          v-if="error && !restoringSession"
          class="mt-4 text-center text-sm text-destructive-foreground"
        >
          {{ error }}
        </p>
      </CardContent>
    </Card>
  </div>
</template>
