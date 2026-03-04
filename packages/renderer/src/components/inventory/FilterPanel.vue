<script setup lang="ts">
import { computed } from 'vue';
import type { SortBy } from '@/composables/useItemGroups';
import { X } from 'lucide-vue-next';

interface RarityOption {
  name: string;
  color: string;
}

const ENTITY_LABELS: Record<string, string> = {
  skin: 'Skins',
  sticker: 'Stickers',
  agent: 'Agents',
  crate: 'Cases',
  collectible: 'Collectibles',
  graffiti: 'Graffiti',
  music_kit: 'Music Kits',
  keychain: 'Keychains',
  patch: 'Patches',
  key: 'Keys',
  tool: 'Tools',
  sticker_slab: 'Sticker Slabs',
  highlight: 'Highlights',
};

function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity.charAt(0).toUpperCase() + entity.slice(1);
}

const props = defineProps<{
  open: boolean;
  rarities: RarityOption[];
  entities: string[];
  rarityFilter: string[];
  entityFilter: string[];
  sortBy: SortBy;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'update:rarityFilter': [value: string[]];
  'update:entityFilter': [value: string[]];
  'update:sortBy': [value: SortBy];
}>();

const sortOptions: { label: string; value: SortBy }[] = [
  { label: 'Default', value: 'name' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Rarity: Low to High', value: 'rarity-asc' },
  { label: 'Rarity: High to Low', value: 'rarity-desc' },
];

function toggle(current: string[], value: string): string[] {
  const idx = current.indexOf(value);
  if (idx >= 0) return current.filter(v => v !== value);
  return [...current, value];
}

function clearAll() {
  emit('update:rarityFilter', []);
  emit('update:entityFilter', []);
  emit('update:sortBy', 'name');
}

const hasActiveFilters = computed(
  () => props.rarityFilter.length > 0 || props.entityFilter.length > 0 || props.sortBy !== 'name',
);
</script>

<template>
  <USlideover
    :open="props.open"
    side="right"
    title="Filter & Sort"
    description="Filter items by type and rarity, and change sort order"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col divide-y divide-(--ui-border)">
        <!-- Sort -->
        <div class="pb-5">
          <div
            class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)"
          >
            Sort by
          </div>
          <div class="flex flex-col gap-1">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              :class="
                props.sortBy === option.value
                  ? 'bg-(--ui-primary)/10 text-(--ui-primary)'
                  : 'hover:bg-(--ui-bg-elevated) text-(--ui-text-muted)'
              "
              @click="emit('update:sortBy', option.value)"
            >
              <div
                class="h-2 w-2 shrink-0 rounded-full border transition-colors"
                :class="
                  props.sortBy === option.value
                    ? 'border-(--ui-primary) bg-(--ui-primary)'
                    : 'border-(--ui-border)'
                "
              />
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- Entity/type filter -->
        <div v-if="props.entities.length > 0" class="py-5">
          <div
            class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)"
          >
            Type
          </div>
          <div class="flex flex-col gap-1">
            <button
              v-for="entity in props.entities"
              :key="entity"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              :class="
                props.entityFilter.includes(entity)
                  ? 'bg-(--ui-bg-elevated)'
                  : 'hover:bg-(--ui-bg-elevated)/50 text-(--ui-text-muted)'
              "
              @click="emit('update:entityFilter', toggle(props.entityFilter, entity))"
            >
              <UCheckbox
                :model-value="props.entityFilter.includes(entity)"
                size="sm"
                tabindex="-1"
                @click.prevent
              />
              {{ entityLabel(entity) }}
            </button>
          </div>
        </div>

        <!-- Rarity filter -->
        <div v-if="props.rarities.length > 0" class="pt-5">
          <div
            class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)"
          >
            Rarity
          </div>
          <div class="flex flex-col gap-1">
            <button
              v-for="rarity in props.rarities"
              :key="rarity.name"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              :class="
                props.rarityFilter.includes(rarity.name)
                  ? 'bg-(--ui-bg-elevated)'
                  : 'hover:bg-(--ui-bg-elevated)/50 text-(--ui-text-muted)'
              "
              @click="emit('update:rarityFilter', toggle(props.rarityFilter, rarity.name))"
            >
              <UCheckbox
                :model-value="props.rarityFilter.includes(rarity.name)"
                size="sm"
                tabindex="-1"
                @click.prevent
              />
              <div
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: rarity.color }"
              />
              {{ rarity.name }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <template v-if="hasActiveFilters" #footer>
      <UButton variant="ghost" color="neutral" block @click="clearAll">
        <X class="h-3.5 w-3.5" />
        Clear all filters
      </UButton>
    </template>
  </USlideover>
</template>
