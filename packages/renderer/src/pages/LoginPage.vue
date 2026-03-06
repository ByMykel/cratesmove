<script setup lang="ts">
import { ref } from 'vue';
import CredentialLogin from '@/components/auth/CredentialLogin.vue';
import SavedAccountList from '@/components/auth/SavedAccountList.vue';
import { useSteam } from '@/composables/useSteam';

const { savedAccounts, switchingAccount } = useSteam();

const view = ref<'accounts' | 'credentials'>(
  savedAccounts.value.length > 0 ? 'accounts' : 'credentials',
);
</script>

<template>
  <div class="relative flex h-full items-center justify-center overflow-hidden bg-(--ui-bg) p-4">
    <div class="flex w-full max-w-sm flex-col items-center gap-6">
      <!-- Card -->
      <UCard class="w-full ring-0 shadow-none" :ui="{ body: 'sm:p-6' }">
        <Transition
          mode="out-in"
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-2 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-2 opacity-0"
        >
          <!-- Saved accounts list -->
          <div v-if="view === 'accounts'" key="saved">
            <SavedAccountList />

            <UButton
              variant="link"
              color="neutral"
              block
              class="mt-4"
              :disabled="switchingAccount"
              @click="view = 'credentials'"
            >
              Sign in with a different account
            </UButton>
          </div>

          <!-- Credential login form -->
          <div v-else key="credentials">
            <CredentialLogin />

            <UButton
              v-if="savedAccounts.length > 0"
              variant="link"
              color="neutral"
              block
              class="mt-4"
              @click="view = 'accounts'"
            >
              Back to saved accounts
            </UButton>
          </div>
        </Transition>
      </UCard>
    </div>
  </div>
</template>
