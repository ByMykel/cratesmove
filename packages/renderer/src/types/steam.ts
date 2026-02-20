export interface InventoryItem {
  id: string;
  classid: string;
  instanceid: string;
  name: string;
  market_hash_name: string;
  image: string;
  tradable: boolean;
  movable: boolean;
  def_index: number;
  paint_index?: number;
  rarity?: string;
  rarity_color?: string;
  quality?: string;
  paint_wear?: number;
  custom_name?: string;
  stickers?: ReadonlyArray<{ name: string; icon_url: string }>;
  _parseError?: boolean;
  _rawData?: string;
}

export type ItemLocation = { type: 'inventory' } | { type: 'storage'; storageId: string };

export interface NormalizedItem extends InventoryItem {
  location: ItemLocation;
}

export interface StorageUnit {
  id: string;
  name: string;
  item_count: number;
  custom_name?: string;
}

export interface UserInfo {
  steamId: string;
  personaName: string;
  avatarUrl: string;
}

export interface SavedAccountMeta {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  addedAt: number;
}

export type AuthState =
  | 'disconnected'
  | 'connecting'
  | 'waiting-for-steam-guard'
  | 'connected'
  | 'error';

export interface OperationProgress {
  current: number;
  total: number;
  itemId: string;
}

export interface PriceData {
  metadata: {
    updated_at: string;
    currency: string;
    item_count: number;
  };
  prices: Record<string, number>; // market_hash_name -> price in USD cents
}
