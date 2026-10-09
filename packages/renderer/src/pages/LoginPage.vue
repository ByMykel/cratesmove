<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import CredentialLogin from '@/components/auth/CredentialLogin.vue';
import WebtokenLogin from '@/components/auth/WebtokenLogin.vue';
import SavedAccountList from '@/components/auth/SavedAccountList.vue';
import ProxyDialog from '@/components/layout/ProxyDialog.vue';
import { useRoute } from 'vue-router';
import { useSteam } from '@/composables/useSteam';
import { useSettings } from '@/composables/useSettings';

const { savedAccounts } = useSteam();
const { proxyMode } = useSettings();

const route = useRoute();

const view = ref<'accounts' | 'credentials' | 'webtoken'>(
  savedAccounts.value.length > 0 && route.query.addAccount !== 'true' ? 'accounts' : 'credentials',
);

watch(
  () => savedAccounts.value.length,
  count => {
    if (count === 0 && view.value === 'accounts') view.value = 'credentials';
  },
);

const showProxyDialog = ref(false);

const otherMethod = computed(() => (view.value === 'webtoken' ? 'credentials' : 'webtoken'));
</script>

<template>
  <div class="relative flex h-full items-center justify-center overflow-hidden bg-(--ui-bg) p-4">
    <div class="flex w-full max-w-sm flex-col items-center gap-4">
      <!-- Card -->
      <UCard class="w-full ring-0 shadow-none" :ui="{ body: 'p-0 sm:p-0' }">
        <!-- Saved accounts list -->
        <div v-if="view === 'accounts'" key="saved">
          <SavedAccountList @add="view = 'credentials'" />
        </div>

        <!-- Sign-in forms -->
        <div v-else :key="view" class="flex flex-col">
          <UButton
            v-if="savedAccounts.length > 0"
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-arrow-left"
            class="mb-4 self-start"
            @click="view = 'accounts'"
          >
            Saved accounts
          </UButton>

          <CredentialLogin v-if="view === 'credentials'" />
          <WebtokenLogin v-else />

          <div
            class="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-(--ui-border) bg-(--ui-bg) px-3 py-3 transition-all duration-150 hover:border-(--ui-primary)/30 hover:bg-(--ui-bg-elevated) hover:shadow-sm"
            @click="view = otherMethod"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--ui-text-highlighted)/6 text-(--ui-text-muted)"
            >
              <UIcon
                :name="otherMethod === 'webtoken' ? 'i-lucide-key-round' : 'i-lucide-user-round'"
                class="h-4 w-4"
              />
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="text-sm font-medium">
                {{
                  otherMethod === 'webtoken' ? 'Use a browser token' : 'Use username and password'
                }}
              </span>
              <span class="truncate text-xs text-(--ui-text-muted)">
                {{
                  otherMethod === 'webtoken'
                    ? 'One-time sign-in, nothing is saved'
                    : 'Stays signed in on this device'
                }}
              </span>
            </div>
            <UIcon name="i-lucide-chevron-right" class="h-4 w-4 text-(--ui-text-dimmed)" />
          </div>
        </div>
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
