<script setup lang="ts">
import { ref } from 'vue';
import CredentialLogin from '@/components/auth/CredentialLogin.vue';
import WebtokenLogin from '@/components/auth/WebtokenLogin.vue';
import SavedAccountList from '@/components/auth/SavedAccountList.vue';
import ProxyDialog from '@/components/layout/ProxyDialog.vue';
import { useSteam } from '@/composables/useSteam';
import { useSettings } from '@/composables/useSettings';

const { savedAccounts, switchingAccount } = useSteam();
const { proxyMode } = useSettings();

const view = ref<'accounts' | 'credentials' | 'webtoken'>(
  savedAccounts.value.length > 0 ? 'accounts' : 'credentials',
);

const showProxyDialog = ref(false);
</script>

<template>
  <div class="relative flex h-full items-center justify-center overflow-hidden bg-(--ui-bg) p-4">
    <div class="flex w-full max-w-sm flex-col items-center gap-4">
      <!-- Card -->
      <UCard class="w-full ring-0 shadow-none" :ui="{ body: 'p-0 sm:p-0' }">
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
          <div v-else-if="view === 'credentials'" key="credentials">
            <CredentialLogin />

            <UButton variant="link" color="neutral" block class="mt-4" @click="view = 'webtoken'">
              Sign in with browser token instead
            </UButton>

            <UButton
              v-if="savedAccounts.length > 0"
              variant="link"
              color="neutral"
              block
              @click="view = 'accounts'"
            >
              Back to saved accounts
            </UButton>
          </div>

          <!-- Webtoken login form -->
          <div v-else key="webtoken">
            <WebtokenLogin />

            <UButton
              variant="link"
              color="neutral"
              block
              class="mt-4"
              @click="view = 'credentials'"
            >
              Sign in with username and password instead
            </UButton>

            <UButton
              v-if="savedAccounts.length > 0"
              variant="link"
              color="neutral"
              block
              @click="view = 'accounts'"
            >
              Back to saved accounts
            </UButton>
          </div>
        </Transition>
      </UCard>
    </div>

    <UButton
      variant="ghost"
      color="neutral"
      size="xs"
      icon="i-lucide-globe"
      class="absolute bottom-4 right-4 text-(--ui-text-dimmed)"
      @click="showProxyDialog = true"
    >
      {{ proxyMode === 'custom' ? 'Proxy enabled' : 'Configure proxy' }}
    </UButton>

    <ProxyDialog v-model:open="showProxyDialog" />
  </div>
</template>
