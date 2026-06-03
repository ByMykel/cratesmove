<script setup lang="ts">
import { computed } from 'vue';
import type { TradeStatus } from '@/types/steam';
import { Tag, Clock } from 'lucide-vue-next';
import { statusTitle, timeLeft } from './tradeStatus';

const props = defineProps<{
  status: TradeStatus | 'mixed';
  tradeHoldExpires?: string | null;
}>();

const view = computed(() => {
  if (props.status === 'market_listed') {
    return { icon: Tag, label: 'Listed', class: 'text-amber-500' };
  }
  if (props.status === 'trade_hold') {
    return {
      icon: Clock,
      label: timeLeft(props.tradeHoldExpires) ?? 'On hold',
      class: 'text-(--ui-text-muted)',
    };
  }
  return null;
});

const title = computed(() => statusTitle(props.status, props.tradeHoldExpires));
</script>

<template>
  <span
    v-if="view"
    class="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium leading-none"
    :class="view.class"
    :title="title ?? undefined"
  >
    <component :is="view.icon" class="h-3 w-3" />
    {{ view.label }}
  </span>
</template>
