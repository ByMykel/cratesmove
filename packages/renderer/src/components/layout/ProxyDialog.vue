<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useSettings, type ProxyMode, type ProxyType } from '@/composables/useSettings';

const props = defineProps<{ open: boolean }>();
const emits = defineEmits<{ 'update:open': [value: boolean] }>();

const { proxyMode, proxyType, proxyUrl, saveProxy } = useSettings();

const localMode = ref<ProxyMode>(proxyMode.value);
const localType = ref<ProxyType>(proxyType.value);
const localUrl = ref(proxyUrl.value);

watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      localMode.value = proxyMode.value;
      localType.value = proxyType.value;
      localUrl.value = proxyUrl.value;
    }
  },
);

const isValid = computed(() => localMode.value === 'none' || localUrl.value.trim().length > 0);

function handleSave() {
  proxyMode.value = localMode.value;
  proxyType.value = localType.value;
  proxyUrl.value = localMode.value === 'custom' ? localUrl.value.trim() : '';
  saveProxy();
  emits('update:open', false);
}
</script>

<template>
  <UModal
    :open="open"
    title="Proxy Settings"
    description="Configure a proxy for Steam connections."
    :ui="{ footer: 'flex justify-end gap-2' }"
    @update:open="emits('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <button
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
            :class="
              localMode === 'none'
                ? 'bg-(--ui-primary)/10 text-(--ui-primary)'
                : 'hover:bg-(--ui-bg-elevated) text-(--ui-text-muted)'
            "
            @click="localMode = 'none'"
          >
            <span
              class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              :class="
                localMode === 'none' ? 'border-(--ui-primary)' : 'border-(--ui-border-accented)'
              "
            >
              <span v-if="localMode === 'none'" class="h-2 w-2 rounded-full bg-(--ui-primary)" />
            </span>
            <div>
              <p class="font-medium">Direct connection</p>
              <p class="text-xs text-(--ui-text-toned)">No proxy</p>
            </div>
          </button>

          <button
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
            :class="
              localMode === 'custom'
                ? 'bg-(--ui-primary)/10 text-(--ui-primary)'
                : 'hover:bg-(--ui-bg-elevated) text-(--ui-text-muted)'
            "
            @click="localMode = 'custom'"
          >
            <span
              class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              :class="
                localMode === 'custom' ? 'border-(--ui-primary)' : 'border-(--ui-border-accented)'
              "
            >
              <span v-if="localMode === 'custom'" class="h-2 w-2 rounded-full bg-(--ui-primary)" />
            </span>
            <div>
              <p class="font-medium">Custom proxy</p>
              <p class="text-xs text-(--ui-text-toned)">HTTP or SOCKS5 proxy</p>
            </div>
          </button>
        </div>

        <div
          v-if="localMode === 'custom'"
          class="flex flex-col gap-3 border-t border-(--ui-border) pt-4"
        >
          <div class="flex gap-1 rounded-lg bg-(--ui-bg-elevated) p-1">
            <button
              v-for="t in ['http', 'socks5'] as const"
              :key="t"
              class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              :class="
                localType === t
                  ? 'bg-(--ui-bg) text-(--ui-text) shadow-sm'
                  : 'text-(--ui-text-muted) hover:text-(--ui-text)'
              "
              @click="localType = t"
            >
              {{ t === 'http' ? 'HTTP' : 'SOCKS5' }}
            </button>
          </div>

          <UInput
            v-model="localUrl"
            :placeholder="
              localType === 'http' ? 'http://user:pass@host:port' : 'socks5://user:pass@host:port'
            "
            :ui="{ root: 'w-full' }"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton variant="ghost" color="neutral" @click="emits('update:open', false)">
        Cancel
      </UButton>
      <UButton :disabled="!isValid" @click="handleSave"> Save </UButton>
    </template>
  </UModal>
</template>
