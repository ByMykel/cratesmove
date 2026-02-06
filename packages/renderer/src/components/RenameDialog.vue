<script setup lang="ts">
import {ref, watch} from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

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
  <Dialog :open="open" @update:open="emits('update:open', $event)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Rename Storage Unit</DialogTitle>
        <DialogDescription> Enter a new name for this storage unit. </DialogDescription>
      </DialogHeader>

      <Input
        v-model="name"
        placeholder="Storage unit name"
        maxlength="36"
        @keydown.enter="handleConfirm"
      />

      <DialogFooter>
        <Button variant="outline" @click="emits('update:open', false)"> Cancel </Button>
        <Button :disabled="!name.trim()" @click="handleConfirm"> Rename </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
