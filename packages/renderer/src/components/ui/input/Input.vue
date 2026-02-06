<script setup lang="ts">
import {type HTMLAttributes, computed} from 'vue';
import {cn} from '@/lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
  modelValue?: string | number;
}>();

const emits = defineEmits<{
  'update:modelValue': [value: string];
}>();

const delegatedProps = computed(() => {
  const {class: _, ...rest} = props;
  return rest;
});
</script>

<template>
  <input
    :class="
      cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
    :value="modelValue"
    v-bind="delegatedProps"
    @input="emits('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
