<script setup lang="ts">
import {ref, watch} from 'vue';

const props = defineProps<{
  open: boolean;
  currentName: string;
}>();

const emits = defineEmits<{
  'update:open': [value: boolean];
  confirm: [name: string];
}>();

const name = ref(props.currentName);

watch(
  () => props.currentName,
  val => {
    name.value = val;
  },
);

function handleConfirm() {
  if (!name.value.trim()) return;
  emits('confirm', name.value.trim());
  emits('update:open', false);
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="emits('update:open', $event)"
    title="Rename Storage Unit"
    description="Enter a new name for this storage unit."
  >
    <template #body>
      <UInput
        v-model="name"
        placeholder="Storage unit name"
        :maxlength="36"
        @keydown.enter="handleConfirm"
      />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="outline" color="neutral" @click="emits('update:open', false)"> Cancel </UButton>
        <UButton :disabled="!name.trim()" @click="handleConfirm"> Rename </UButton>
      </div>
    </template>
  </UModal>
</template>
