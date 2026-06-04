<script setup lang="ts">
import { computed } from 'vue';
import type { TradeStatus } from '@/types/steam';
import { statusTitle } from './tradeStatus';

const props = defineProps<{
  status: TradeStatus | 'mixed';
  tradeHoldExpires?: string | null;
}>();

const view = computed(() => {
  if (props.status === 'market_listed') {
    return {
      icon: 'https://community.akamai.steamstatic.com/public/images/economy/listed_on_market.png',
      label: 'On Market',
      color: '#325396',
    };
  }
  if (props.status === 'trade_hold') {
    return {
      icon: 'https://community.akamai.steamstatic.com/public/images/economy/protected_items_badge2.png',
      label: 'Trade Protected',
      color: '#c99810',
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
    :style="{ color: view.color }"
    :title="title ?? undefined"
  >
    <img :src="view.icon" :alt="view.label" class="h-3.5 w-auto" />
    {{ view.label }}
  </span>
</template>
