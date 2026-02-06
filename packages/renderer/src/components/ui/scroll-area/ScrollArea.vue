<script setup lang="ts">
import {type HTMLAttributes} from 'vue';
import {ScrollAreaRoot, ScrollAreaViewport} from 'radix-vue';
import ScrollBar from './ScrollBar.vue';
import {cn} from '@/lib/utils';

const props = defineProps<{class?: HTMLAttributes['class']}>();
</script>

<template>
  <ScrollAreaRoot :class="cn('relative overflow-hidden', props.class)">
    <ScrollAreaViewport class="h-full w-full rounded-[inherit]">
      <slot />
    </ScrollAreaViewport>
    <ScrollBar />
    <ScrollBar orientation="horizontal" />
  </ScrollAreaRoot>
</template>
