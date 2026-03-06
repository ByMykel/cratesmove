# `globaloffensive` Library Reference (v3.x)

> Used in `packages/main/src/modules/SteamConnection.ts`

## Overview

`globaloffensive` communicates with the CS2 Game Coordinator (GC). It layers on top of a connected `SteamUser` instance. The GC manages CS2 inventory, storage unit (casket) operations, and item state.

- **`steam-user`** handles: Steam network connection, auth, personas.
- **`globaloffensive`** handles: CS2 inventory, casket ops, item renaming.

---

## Constructor

```ts
const csgo = new GlobalOffensive(steamUser);
```

Takes a `SteamUser` instance. Automatically listens for game-related events. Once `steamUser.gamesPlayed([730])` is called, the GC handshake begins and `connectedToGC` fires when ready.

---

## Properties

### `haveGCSession`

`boolean` -- `true` if connected to the GC. Only call GC methods when this is `true`.

### `inventory`

`Array<object>` -- All CS2 inventory items. Populated after `connectedToGC` and kept up to date by `itemAcquired`/`itemRemoved`/`itemChanged` events.

**Item fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | Unique asset ID |
| `classid` | `string \| number` | Steam economy class ID |
| `instanceid` | `string \| number` | Steam economy instance ID |
| `def_index` | `number` | Item definition index (`1201` = Storage Unit) |
| `custom_name` | `string` | User-applied name |
| `paint_index` | `number` | Skin paint index |
| `paint_seed` | `number` | Pattern seed |
| `paint_wear` | `number` | Wear float (0.0 = FN, 1.0 = BS) |
| `quality` | `number` | Item quality (3 = knives/gloves) |
| `origin` | `number` | How obtained (0 = timed drop) |
| `rarity` | `number` | Rarity tier |
| `tradable` | `boolean` | Currently tradable |
| `casket_id` | `string` | If inside a storage unit, the unit's ID |
| `casket_contained_item_count` | `number` | For storage units: items stored inside |
| `stickers` | `Array` | Applied stickers |
| `attribute` | `Array` | Raw item attributes with `def_index` and `value_bytes` (Buffer) |

**Important:** Items with `casket_id` set are inside a storage unit and should be filtered out when showing the main inventory.

---

## Methods

### `getCasketContents(casketId, callback)`

Inspects a storage unit's contents.

- `casketId`: `string` -- asset ID of the storage unit.
- `callback`: `(err: Error | null, items: Array) => void`
- **This is the only casket method that uses a callback.**

### `addToCasket(casketId, itemId)`

Deposits an item into a storage unit. **Fire-and-forget** (no callback).

Completion detected via events:
- `itemRemoved` -- item left inventory
- `itemCustomizationNotification` with type `CasketAdded` (1013)

### `removeFromCasket(casketId, itemId)`

Retrieves an item from a storage unit. **Fire-and-forget** (no callback).

Completion detected via events:
- `itemAcquired` -- item entered inventory
- `itemCustomizationNotification` with type `CasketRemoved` (1014)

### `nameItem(nameTagId, itemId, name)`

Renames an item. **Fire-and-forget.**

- `nameTagId`: `number` -- asset ID of Name Tag to consume. **Pass `0` to rename storage units for free** (storage units can always be renamed at no cost).
- `itemId`: `string` -- asset ID of item to rename.
- `name`: `string` -- new name.

Completion detected via `itemChanged`.

---

## Events

### `connectedToGC`

GC connection established and inventory loaded. Safe to call GC methods after this.

May fire multiple times without an intervening `disconnectedFromGC` (indicates GC restart).

### `disconnectedFromGC`

GC connection lost. The library handles automatic reconnection.

### `itemAcquired`

```ts
csgo.on('itemAcquired', (item) => { ... });
```

New item entered inventory (including items retrieved from storage units).

### `itemRemoved`

```ts
csgo.on('itemRemoved', (item) => { ... });
```

Item left inventory (including items deposited into storage units).

### `itemChanged`

```ts
csgo.on('itemChanged', (oldItem, item) => { ... });
```

Existing item modified (renamed, sticker applied, etc.).

### `itemCustomizationNotification`

```ts
csgo.on('itemCustomizationNotification', (itemIds, notificationType) => { ... });
```

GC reports an item customization event.

**Relevant notification types for storage units:**

| Name | Value | Meaning |
|------|-------|---------|
| `CasketTooFull` | 1011 | Storage unit is full |
| `CasketContents` | 1012 | Contents loaded |
| `CasketAdded` | 1013 | Item deposited successfully |
| `CasketRemoved` | 1014 | Item retrieved successfully |
| `CasketInvFull` | 1015 | Main inventory full, can't retrieve |

---

## Key Behaviors

### GC Connection Requires `gamesPlayed([730])`

The GC session starts when Steam sees the client is "playing" CS2 (AppID 730). Call `steamUser.gamesPlayed([730], true)` after `loggedOn`. The `true` force-kicks other sessions.

### Casket Operations Are Fire-and-Forget

`addToCasket` and `removeFromCasket` return immediately. You must listen for events to detect completion. Our codebase wraps each call in a Promise with:
- A 5-second timeout (`OPERATION_TIMEOUT_MS`)
- A 500ms delay between operations (`OPERATION_DELAY_MS`) to avoid overwhelming the GC

### Storage Units Are `def_index === 1201`

Storage units are regular inventory items with `def_index` of `1201`. Filter them into a separate list and exclude from the main inventory view.

### Items Inside Storage Units Have `casket_id` Set

When `getCasketContents` loads contents, those items appear in `inventory` with `casket_id` pointing to the storage unit. Filter them out of the main inventory display.
