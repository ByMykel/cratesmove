<script setup lang="ts">
import {Button} from '@/components/ui/button';
import ConnectionStatus from './ConnectionStatus.vue';
import {useSteam} from '@/composables/useSteam';
import {LogOut, Package} from 'lucide-vue-next';

const {authState, userInfo, logout} = useSteam();
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-border px-4">
    <div class="flex items-center gap-3">
      <Package class="h-6 w-6 text-primary" />
      <h1 class="text-lg font-semibold">CratesMove</h1>
    </div>

    <div class="flex items-center gap-4">
      <ConnectionStatus :state="authState" />

      <template v-if="userInfo">
        <div class="flex items-center gap-2">
          <img
            v-if="userInfo.avatarUrl"
            :src="userInfo.avatarUrl"
            class="h-7 w-7 rounded-full"
            alt="avatar"
          />
          <span class="text-sm">{{ userInfo.personaName }}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          @click="logout"
        >
          <LogOut class="h-4 w-4" />
        </Button>
      </template>
    </div>
  </header>
</template>
