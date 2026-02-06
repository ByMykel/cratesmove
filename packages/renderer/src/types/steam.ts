export interface InventoryItem {
  id: string;
  classid: string;
  instanceid: string;
  name: string;
  market_hash_name: string;
  icon_url: string;
  tradable: boolean;
  movable: boolean;
  def_index: number;
  paint_index?: number;
  rarity?: string;
  rarity_color?: string;
  quality?: string;
  paint_wear?: number;
  custom_name?: string;
  stickers?: Array<{name: string; icon_url: string}>;
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

export type AuthState = 'disconnected' | 'connecting' | 'waiting-for-steam-guard' | 'connected' | 'error';

export interface OperationProgress {
  current: number;
  total: number;
  itemId: string;
}
