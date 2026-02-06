<script setup lang="ts">
import {Button} from '@/components/ui/button';
import {useSteam} from '@/composables/useSteam';
import {LogOut, Package} from 'lucide-vue-next';

const {userInfo, logout} = useSteam();
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-border px-4">
    <div class="flex items-center gap-3">
      <Package class="h-6 w-6 text-primary" />
      <h1 class="text-lg font-semibold">CratesMove</h1>
    </div>

    <div v-if="userInfo" class="flex items-center gap-3">
      <img
        v-if="userInfo.avatarUrl"
        :src="userInfo.avatarUrl"
        class="h-7 w-7 rounded-full ring-1 ring-border"
        alt="avatar"
      />
      <span class="text-sm text-muted-foreground">{{ userInfo.personaName }}</span>

      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-muted-foreground hover:text-foreground"
        @click="logout"
      >
        <LogOut class="h-3.5 w-3.5" />
      </Button>
    </div>
  </header>
</template>
