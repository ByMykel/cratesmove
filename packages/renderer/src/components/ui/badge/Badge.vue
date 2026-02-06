<script setup lang="ts">
import {type HTMLAttributes} from 'vue';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type BadgeVariants = VariantProps<typeof badgeVariants>;

const props = defineProps<{
  variant?: NonNullable<BadgeVariants['variant']>;
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div :class="cn(badgeVariants({variant}), props.class)">
    <slot />
  </div>
</template>
