import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

interface ItemEntry {
  name: string;
  image: string;
  market_hash_name?: string | null;
}

interface InventoryData {
  skins: Record<string, Record<string, ItemEntry>>;
  crates: Record<string, ItemEntry>;
  collectibles: Record<string, ItemEntry>;
  stickers: Record<string, ItemEntry>;
  graffiti: Record<string, ItemEntry>;
  music_kits: Record<string, ItemEntry>;
  keychains: Record<string, ItemEntry>;
  highlights: Record<string, ItemEntry>;
}

export type ItemCategory =
  | 'skin'
  | 'music_kit'
  | 'keychain'
  | 'graffiti'
  | 'crate'
  | 'collectible'
  | 'sticker'
  | 'highlight';

export interface ResolvedItemData {
  name: string;
  image: string;
  category: ItemCategory;
}

let data: InventoryData | null = null;
let loaded = false;

export async function loadItemData(): Promise<void> {
  if (loaded) return;

  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const jsonPath = join(currentDir, '..', 'src', 'data', 'inventory.json');

    let raw: string;
    try {
      raw = await readFile(jsonPath, 'utf-8');
    } catch {
      // In production, the file is next to the built JS
      const prodPath = join(currentDir, 'data', 'inventory.json');
      raw = await readFile(prodPath, 'utf-8');
    }

    data = JSON.parse(raw);
    loaded = true;

    const skinCount = Object.values(data!.skins).reduce(
      (sum, weapon) => sum + Object.keys(weapon).length,
      0,
    );
    console.log(
      `[ItemDataService] Loaded: ${skinCount} skins, ${Object.keys(data!.crates).length} crates, ${Object.keys(data!.collectibles).length} collectibles, ${Object.keys(data!.stickers).length} stickers, ${Object.keys(data!.graffiti).length} graffiti, ${Object.keys(data!.music_kits).length} music_kits, ${Object.keys(data!.keychains).length} keychains, ${Object.keys(data!.highlights).length} highlights`,
    );
  } catch (err) {
    console.error('[ItemDataService] Failed to load inventory.json:', err);
  }
}

/**
 * Resolve an item from GC data.
 * - Skins: def_index + paint_index
 * - Music kits: music_index (from attribute 166)
 * - Graffiti: stickers[0].sticker_id + graffiti_tint (from attribute 233)
 *   Keys in JSON: "{sticker_id}_{tint}" for tinted, "{sticker_id}" for monochrome
 * - Keychains (charms): keychain_index (from attribute 299)
 * - Stickers/patches: stickers[0].sticker_id
 * - Crates/cases/keys: def_index
 * - Collectibles (coins, pins): def_index
 */
export function resolveItem(gcItem: {
  def_index: number;
  paint_index?: number;
  stickers?: any[];
  music_index?: number;
  graffiti_tint?: number;
  keychain_index?: number;
}): ResolvedItemData | null {
  if (!data) return null;

  const defIdx = String(gcItem.def_index);

  // 1. Skins: def_index + paint_index
  if (gcItem.paint_index && gcItem.paint_index > 0) {
    const weapon = data.skins[defIdx];
    if (weapon) {
      const skin = weapon[String(gcItem.paint_index)];
      if (skin) return {name: skin.name, image: skin.image, category: 'skin'};
    }
  }

  // 2. Music kits: music_index (extracted from attribute 166)
  if (gcItem.music_index && gcItem.music_index > 0) {
    const kit = data.music_kits[String(gcItem.music_index)];
    if (kit) return {name: kit.name, image: kit.image, category: 'music_kit'};
  }

  // 3. Keychains (charms): keychain_index (extracted from attribute 299)
  if (gcItem.keychain_index && gcItem.keychain_index > 0) {
    const keychain = data.keychains[String(gcItem.keychain_index)];
    if (keychain) return {name: keychain.name, image: keychain.image, category: 'keychain'};
  }

  // 4. Graffiti: uses stickers[0].sticker_id + graffiti_tint (extracted from attribute 233)
  // Key format: "{sticker_id}_{tint}" for tinted graffiti, "{sticker_id}" for monochrome
  if (gcItem.graffiti_tint !== undefined && gcItem.stickers?.length) {
    const stickerId = gcItem.stickers[0].sticker_id;
    if (stickerId) {
      // Try tinted key first: "1699_8"
      const tintedKey = `${stickerId}_${gcItem.graffiti_tint}`;
      const tinted = data.graffiti[tintedKey];
      if (tinted) return {name: tinted.name, image: tinted.image, category: 'graffiti'};

      // Fallback to monochrome key: "1653"
      const mono = data.graffiti[String(stickerId)];
      if (mono) return {name: mono.name, image: mono.image, category: 'graffiti'};
    }
  }

  // 5. Crates / cases / keys
  const crate = data.crates[defIdx];
  if (crate) return {name: crate.name, image: crate.image, category: 'crate'};

  // 6. Collectibles (coins, pins, etc.)
  const collectible = data.collectibles[defIdx];
  if (collectible)
    return {name: collectible.name, image: collectible.image, category: 'collectible'};

  // 7. Stickers/patches as items: use stickers[0].sticker_id
  if (gcItem.stickers?.length) {
    const stickerId = gcItem.stickers[0].sticker_id;
    if (stickerId) {
      const sticker = data.stickers[String(stickerId)];
      if (sticker) return {name: sticker.name, image: sticker.image, category: 'sticker'};
    }
  }

  return null;
}

export function isLoaded(): boolean {
  return loaded;
}
