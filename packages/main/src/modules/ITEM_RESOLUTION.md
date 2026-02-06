# Item Resolution: From GC Data to Human-Readable Items

This document describes how cratesmove transforms raw CS2 Game Coordinator (GC) item data into human-readable items with names and images.

## 1. CSOEconItem (Raw GC Item)

The `globaloffensive` library emits inventory items as `CSOEconItem` protobuf messages. Each item arriving from the GC has these key properties:

| Property                       | Type       | Description                                      |
|--------------------------------|------------|--------------------------------------------------|
| `id`                           | `bigint`   | Unique item ID                                   |
| `def_index`                    | `uint32`   | Item definition index (weapon/tool type)         |
| `paint_index`                  | `uint32`   | Skin paint kit index (0 = no skin)               |
| `paint_wear`                   | `float`    | Float wear value (0.0–1.0)                       |
| `quality`                      | `uint32`   | Item quality (3 = knife/glove star)               |
| `rarity`                       | `uint32`   | Item rarity tier (1–6)                           |
| `origin`                       | `uint32`   | How the item was obtained (0 = default/promo)    |
| `custom_name`                  | `string`   | User-applied name tag                            |
| `casket_contained_item_count`  | `uint32`   | Number of items in a storage unit                |
| `stickers[]`                   | `array`    | Applied stickers/patches (see below)             |
| `attribute[]`                  | `array`    | Raw attribute array (see below)                  |

### The `stickers[]` Array

Each entry in `stickers[]` represents a sticker, patch, or (for sealed graffiti) the graffiti identity:

| Field        | Type     | Description                          |
|--------------|----------|--------------------------------------|
| `slot`       | `uint32` | Sticker slot position (0–4)         |
| `sticker_id` | `uint32` | Sticker kit definition ID           |
| `wear`       | `float`  | Sticker wear/scratchedness          |
| `scale`      | `float`  | Sticker scale                       |
| `rotation`   | `float`  | Sticker rotation                    |

### The `attribute[]` Array

Each entry in `attribute[]` is a key-value pair with:

| Field         | Type     | Description                                     |
|---------------|----------|-------------------------------------------------|
| `def_index`   | `uint32` | Attribute definition index (identifies the type)|
| `value_bytes` | `Buffer` | Raw value as a byte buffer                      |

The `attribute[]` array is the primary mechanism for encoding item metadata that doesn't have a dedicated top-level field on `CSOEconItem`. Values are stored as raw bytes and must be decoded.

## 2. Attribute Extraction

### How `#getAttributeUint32(item, attrDefIndex)` Works

To read a uint32 value from the attribute array:

1. Find the attribute entry where `def_index === attrDefIndex`
2. Check that `value_bytes` exists
3. Handle serialization: `value_bytes` is a `Buffer` at runtime but may serialize as `{type: "Buffer", data: [...]}` when passed through JSON — use `Buffer.isBuffer()` to detect, otherwise reconstruct via `Buffer.from(attrib.value_bytes.data)`
4. Verify the buffer has at least 4 bytes
5. Read as little-endian unsigned 32-bit integer: `buf.readUInt32LE(0)`

```typescript
#getAttributeUint32(item: any, attrDefIndex: number): number | undefined {
  const attrib = (item.attribute || []).find((a: any) => a.def_index === attrDefIndex);
  if (!attrib?.value_bytes) return undefined;
  const buf = Buffer.isBuffer(attrib.value_bytes)
    ? attrib.value_bytes
    : Buffer.from(attrib.value_bytes.data || []);
  if (buf.length < 4) return undefined;
  return buf.readUInt32LE(0);
}
```

### Known Attribute `def_index` Values

| `def_index` | Name             | Usage                                       |
|-------------|------------------|---------------------------------------------|
| 70          | Icon override    | Storage unit custom icon index              |
| 80          | StatTrak counter | Presence indicates StatTrak item            |
| 113         | Sticker slot     | Sticker application data                    |
| 140         | Souvenir flag    | Presence indicates Souvenir item            |
| 166         | Music index      | Music kit definition index                  |
| 233         | Graffiti tint    | Graffiti color tint ID                      |
| 277         | Free reward      | Value `1` = free/promotional reward (skip)  |

## 3. `inventory.json` Structure

The `inventory.json` database contains pre-built lookup tables for 6 item categories. Each entry maps to `{name, image}` (and optionally `market_hash_name`).

### Category Key Formats

| Category       | Key Format                        | Example Key          | Lookup                                |
|----------------|-----------------------------------|----------------------|---------------------------------------|
| **Skins**      | `skins[def_index][paint_index]`   | `skins["7"]["474"]`  | Two-level: weapon type → paint kit   |
| **Crates**     | `crates[def_index]`               | `crates["4233"]`     | Case/key by item definition          |
| **Collectibles**| `collectibles[def_index]`        | `collectibles["890"]`| Coins, pins, agents by definition    |
| **Stickers**   | `stickers[sticker_id]`            | `stickers["4775"]`   | Sticker kit ID from `stickers[0]`    |
| **Graffiti**   | `graffiti[sticker_id]` or `graffiti[sticker_id_tint]` | `graffiti["1699_8"]` | Sticker ID + optional tint suffix |
| **Music Kits** | `music_kits[music_index]`         | `music_kits["3"]`    | Music definition index from attr 166 |

### Entry Shape

```typescript
interface ItemEntry {
  name: string;              // Human-readable name
  image: string;             // CDN image URL
  market_hash_name?: string; // Steam Market hash name (optional)
}
```

## 4. Resolution Algorithm

The `resolveItem()` function checks categories in a fixed priority order. The first match wins.

### Priority Order

| Priority | Category       | Detection Criteria                          | Lookup Key                              |
|----------|----------------|---------------------------------------------|-----------------------------------------|
| 1        | Skins          | `paint_index > 0`                           | `skins[def_index][paint_index]`         |
| 2        | Music Kits     | `music_index > 0` (from attr 166)           | `music_kits[music_index]`               |
| 3        | Graffiti       | `graffiti_tint !== undefined` AND `stickers[0]` exists | `graffiti[sticker_id_tint]` then `graffiti[sticker_id]` |
| 4        | Crates         | _(fallthrough)_                             | `crates[def_index]`                     |
| 5        | Collectibles   | _(fallthrough)_                             | `collectibles[def_index]`               |
| 6        | Stickers       | `stickers[0]` exists                        | `stickers[sticker_id]`                  |

### Flow

```
          ┌──────────────────┐
          │  resolveItem()   │
          └────────┬─────────┘
                   │
          ┌────────▼─────────┐
          │ paint_index > 0? │──yes──▶ skins[def_index][paint_index]
          └────────┬─────────┘
                   │ no
          ┌────────▼─────────┐
          │ music_index > 0? │──yes──▶ music_kits[music_index]
          └────────┬─────────┘
                   │ no
          ┌────────▼─────────────────┐
          │ graffiti_tint defined    │──yes──▶ graffiti[sid_tint] → graffiti[sid]
          │ AND stickers[0] exists?  │
          └────────┬─────────────────┘
                   │ no
          ┌────────▼─────────┐
          │ crates[def_idx]? │──yes──▶ return crate
          └────────┬─────────┘
                   │ no
          ┌────────▼──────────────┐
          │ collectibles[def_idx]?│──yes──▶ return collectible
          └────────┬──────────────┘
                   │ no
          ┌────────▼─────────────┐
          │ stickers[0] exists?  │──yes──▶ stickers[sticker_id]
          └────────┬─────────────┘
                   │ no
                   ▼
                 null
```

### Pre-Processing in `#formatItem()`

Before `resolveItem()` is called, `#formatItem()` in `SteamConnection` extracts the hidden attributes from the raw GC item:

```typescript
const musicIndex = this.#getAttributeUint32(item, 166);   // attr 166 → music_index
const graffitiTint = this.#getAttributeUint32(item, 233); // attr 233 → graffiti_tint
```

These extracted values are passed alongside the top-level fields (`def_index`, `paint_index`, `stickers`) to `resolveItem()`.

## 5. Graffiti Resolution (Deep Dive)

Sealed graffiti is the most complex item type to resolve because the actual graffiti identity is not in `def_index`.

### Why Graffiti Is Special

- All sealed graffiti share a small set of generic `def_index` values (the "Sealed Graffiti" container item)
- The _actual_ graffiti pattern is identified by `stickers[0].sticker_id`
- The color variant is encoded in attribute 233 (`graffiti_tint`)

### Resolution Steps

1. Check `graffiti_tint !== undefined` AND `stickers[]` has at least one entry
2. Read `sticker_id` from `stickers[0].sticker_id`
3. Build the tinted key: `"{sticker_id}_{tint}"` (e.g., `"1699_8"`)
4. Look up `graffiti["1699_8"]` — if found, return it
5. If not found, fall back to monochrome key: `"{sticker_id}"` (e.g., `"1699"`)
6. Look up `graffiti["1699"]` — if found, return it

### Example

```
Raw GC item:
  def_index: 1348 (generic "Sealed Graffiti")
  stickers: [{ slot: 0, sticker_id: 1699 }]
  attribute: [{ def_index: 233, value_bytes: <08 00 00 00> }]

Extraction:
  graffiti_tint = readUInt32LE(<08 00 00 00>) = 8

Lookup:
  key "1699_8" → graffiti["1699_8"]
  → { name: "Sealed Graffiti | Chess King (Jungle Green)", image: "..." }
```

If the graffiti is monochrome (no tint attribute, or tint key not in database), the fallback key `"1699"` resolves to the base pattern without a color name.

## 6. Casemove Reference

The original [casemove](https://github.com/) project (which cratesmove is based on) uses the same attribute extraction pattern but resolves names differently.

### Key Differences

| Aspect             | casemove                                          | cratesmove                                |
|--------------------|---------------------------------------------------|-------------------------------------------|
| **Data source**    | `items_game.txt` (VDF) + `csgo_english.txt`       | Pre-built `inventory.json`                |
| **Name resolution**| Runtime: parse VDF → look up `loc_name` → translate via `csgo_english.txt` | Compile-time: pre-resolved names in JSON |
| **Image URLs**     | Constructed from `image_inventory` paths in VDF   | Pre-resolved CDN URLs in JSON            |
| **Graffiti tint**  | Looks up tint _name_ from `graffiti_tints` table in VDF, appends as `" (Jungle Green)"` | Uses composite key `sticker_id_tint` in JSON |

### Shared Patterns

Both projects use the same attribute extraction logic:

- **Attribute 166** → `music_index`: `value_bytes.readUInt32LE(0)`
- **Attribute 233** → `graffiti_tint`: `value_bytes.readUInt32LE(0)`
- **Attribute 80** → StatTrak detection (presence check)
- **Attribute 140** → Souvenir detection (presence check)
- **Attribute 277** → Free reward filtering (`readUInt32LE(0) === 1` → skip item)

The `getAttributeValueBytes(item, attribDefIndex)` function in casemove is functionally equivalent to `#getAttributeUint32(item, attrDefIndex)` in cratesmove, with the difference that casemove returns the raw buffer and lets the caller decode, while cratesmove decodes inline.
