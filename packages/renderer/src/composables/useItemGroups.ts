import { computed, type Ref } from 'vue';
import type { InventoryItem } from '@/types/steam';

export interface ItemGroup {
  market_hash_name: string;
  image: string;
  movable: boolean;
  items: InventoryItem[];
  _parseError?: boolean;
}

export function useItemGroups(items: Ref<readonly InventoryItem[]>) {
  const groups = computed<ItemGroup[]>(() => {
    const map = new Map<string, InventoryItem[]>();

    for (const item of items.value) {
      // Give each error item its own group so they don't collapse together
      const key = item._parseError ? `__error_${item.id}` : item.market_hash_name;
      const arr = map.get(key);
      if (arr) {
        arr.push(item);
      } else {
        map.set(key, [item]);
      }
    }

    return Array.from(map.entries())
      .map(([market_hash_name, groupItems]) => ({
        market_hash_name,
        image: groupItems[0].image,
        movable: groupItems.some(i => i.movable !== false),
        items: groupItems,
        _parseError: groupItems[0]._parseError,
      }))
      .sort((a, b) => {
        // Show error items first
        if (a._parseError !== b._parseError) return a._parseError ? -1 : 1;
        if (a.movable !== b.movable) return a.movable ? -1 : 1;
        return a.market_hash_name.localeCompare(b.market_hash_name);
      });
  });

  return { groups };
}
