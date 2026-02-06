<script setup lang="ts">
import {type HTMLAttributes, computed} from 'vue';
import {CheckboxIndicator, CheckboxRoot, type CheckboxRootEmits, type CheckboxRootProps} from 'radix-vue';
import {Check} from 'lucide-vue-next';
import {cn} from '@/lib/utils';

const props = defineProps<CheckboxRootProps & {class?: HTMLAttributes['class']}>();
const emits = defineEmits<CheckboxRootEmits>();

const delegatedProps = computed(() => {
  const {class: _, ...rest} = props;
  return rest;
});
</script>

<template>
  <CheckboxRoot
    :class="cn('peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground', props.class)"
    v-bind="delegatedProps"
    @update:checked="emits('update:checked', $event)"
  >
    <CheckboxIndicator class="flex items-center justify-center text-current">
      <Check class="h-3.5 w-3.5" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
