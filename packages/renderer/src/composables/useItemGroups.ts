import { computed, type Ref } from 'vue';
import type { InventoryItem } from '@/types/steam';

export interface ItemGroup {
  market_hash_name: string;
  image: string;
  rarity: { id: string; name: string; color: string } | null;
  movable: boolean;
  items: InventoryItem[];
  _parseError?: boolean;
}

export type SortBy = 'name' | 'price-asc' | 'price-desc' | 'rarity-asc' | 'rarity-desc';

// CS2 rarity hierarchy (low → high)
const RARITY_ORDER: Record<string, number> = {
  rarity_common_weapon: 0, // Consumer Grade
  rarity_uncommon_weapon: 1, // Industrial Grade
  rarity_rare_weapon: 2, // Mil-Spec Grade
  rarity_mythical_weapon: 3, // Restricted
  rarity_legendary_weapon: 4, // Classified
  rarity_ancient_weapon: 5, // Covert
  rarity_contraband: 6, // Contraband
  // Sticker/agent/etc variants
  rarity_common: 0,
  rarity_uncommon: 1,
  rarity_rare: 2,
  rarity_mythical: 3,
  rarity_legendary: 4,
  rarity_ancient: 5,
};

function rarityRank(rarity: { id: string } | null): number {
  if (!rarity) return -1;
  return RARITY_ORDER[rarity.id] ?? -1;
}

export interface UseItemGroupsOptions {
  items: Ref<readonly InventoryItem[]>;
  search?: Ref<string>;
  rarityFilter?: Ref<string[]>;
  entityFilter?: Ref<string[]>;
  sortBy?: Ref<SortBy>;
  getPrice?: (marketHashName: string) => number | null;
}

export function useItemGroups(
  itemsOrOptions: Ref<readonly InventoryItem[]> | UseItemGroupsOptions,
  search?: Ref<string>,
) {
  // Support both old positional and new options-object signatures
  const opts: UseItemGroupsOptions =
    'value' in itemsOrOptions ? { items: itemsOrOptions, search } : itemsOrOptions;

  const groups = computed<ItemGroup[]>(() => {
    const query = opts.search?.value?.toLowerCase().trim() ?? '';

    let source: readonly InventoryItem[] = opts.items.value;

    // Text search filter
    if (query) {
      source = source.filter(
        item =>
          item.market_hash_name.toLowerCase().includes(query) ||
          (item.custom_name && item.custom_name.toLowerCase().includes(query)),
      );
    }

    // Rarity filter
    const rarities = opts.rarityFilter?.value;
    if (rarities && rarities.length > 0) {
      source = source.filter(item => item.rarity?.name && rarities.includes(item.rarity.name));
    }

    // Entity filter
    const entities = opts.entityFilter?.value;
    if (entities && entities.length > 0) {
      source = source.filter(item => item.entity && entities.includes(item.entity));
    }

    const map = new Map<string, InventoryItem[]>();

    for (const item of source) {
      // Give each error item its own group so they don't collapse together
      const key = item._parseError ? `__error_${item.id}` : item.market_hash_name;
      const arr = map.get(key);
      if (arr) {
        arr.push(item);
      } else {
        map.set(key, [item]);
      }
    }

    const sortBy = opts.sortBy?.value ?? 'name';
    const getPrice = opts.getPrice;

    return Array.from(map.entries())
      .map(([market_hash_name, groupItems]) => ({
        market_hash_name,
        image: groupItems[0].image,
        rarity: groupItems[0].rarity,
        movable: groupItems.some(i => i.movable !== false),
        items: groupItems,
        _parseError: groupItems[0]._parseError,
      }))
      .sort((a, b) => {
        // Show error items first
        if (a._parseError !== b._parseError) return a._parseError ? -1 : 1;
        // Skip movable priority when sorting by rarity so all items sort together
        if (sortBy !== 'rarity-asc' && sortBy !== 'rarity-desc') {
          if (a.movable !== b.movable) return a.movable ? -1 : 1;
        }

        if (sortBy === 'price-asc' || sortBy === 'price-desc') {
          if (getPrice) {
            const priceA = getPrice(a.market_hash_name) ?? -1;
            const priceB = getPrice(b.market_hash_name) ?? -1;
            const diff = sortBy === 'price-asc' ? priceA - priceB : priceB - priceA;
            if (diff !== 0) return diff;
          }
        } else if (sortBy === 'rarity-asc' || sortBy === 'rarity-desc') {
          const rankA = rarityRank(a.rarity);
          const rankB = rarityRank(b.rarity);
          const diff = sortBy === 'rarity-asc' ? rankA - rankB : rankB - rankA;
          if (diff !== 0) return diff;
        }

        return a.market_hash_name.localeCompare(b.market_hash_name);
      });
  });

  return { groups };
}
