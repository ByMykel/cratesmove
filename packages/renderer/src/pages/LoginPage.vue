<script setup lang="ts">
import { ref, computed } from 'vue';
import CredentialLogin from '@/components/auth/CredentialLogin.vue';
import SavedAccountList from '@/components/auth/SavedAccountList.vue';
import { Loader2 } from 'lucide-vue-next';
import { useSteam } from '@/composables/useSteam';

const { error, restoringSession, savedAccounts, switchingAccount } = useSteam();

const showCredentialForm = ref(false);
const hasSavedAccounts = computed(() => savedAccounts.value.length > 0);
</script>

<template>
  <div class="relative flex h-full items-center justify-center overflow-hidden bg-(--ui-bg) p-4">
<div class="flex w-full max-w-sm flex-col items-center gap-6">

      <!-- Card -->
      <UCard
        class="w-full ring-0 shadow-none"
        :ui="{ body: 'sm:p-6' }"
      >
        <!-- Restoring saved session -->
        <div v-if="restoringSession" class="flex flex-col items-center gap-3 py-8">
          <Loader2 class="h-8 w-8 animate-spin text-(--ui-primary)" />
          <p class="text-sm text-(--ui-text-muted)">Restoring session...</p>
        </div>

        <template v-else>
          <Transition mode="out-in" enter-active-class="transition duration-200 ease-out" enter-from-class="translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="translate-y-0 opacity-100" leave-to-class="-translate-y-2 opacity-0">
            <!-- Saved accounts list -->
            <div v-if="hasSavedAccounts && !showCredentialForm" key="saved">
              <SavedAccountList />

              <UButton
                variant="link"
                color="neutral"
                block
                class="mt-4"
                :disabled="switchingAccount"
                @click="showCredentialForm = true"
              >
                Sign in with a different account
              </UButton>
            </div>

            <!-- Credential login form -->
            <div v-else key="credentials">
              <CredentialLogin />

              <UButton
                v-if="hasSavedAccounts"
                variant="link"
                color="neutral"
                block
                class="mt-4"
                @click="showCredentialForm = false"
              >
                Back to saved accounts
              </UButton>
            </div>
          </Transition>

          <div
            v-if="error"
            class="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-500"
          >
            {{ error }}
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>
