# `steam-user` Library Reference (v5.x)

> Used in `packages/main/src/modules/SteamConnection.ts`

## Overview

`steam-user` implements the Steam client protocol. It connects to Steam's Connection Manager (CM) servers and communicates using Steam's protobuf messages. It allows a Node.js process to act as a full Steam client.

Our codebase creates one instance with default options (`new SteamUser()`), which means `autoRelogin: true` is active by default.

---

## Methods

### `logOn({ refreshToken })`

Authenticates with Steam using a JWT refresh token (obtained from `steam-session`).

- Deferred by one tick (`process.nextTick`) internally.
- **Throws** `"Already logged on"` if `steamID` is still set.
- **Throws** `"Already attempting to log on"` if a connection attempt is in progress.
- These throws happen asynchronously (inside `process.nextTick`) and **cannot be caught** with try/catch around `logOn()`.
- On success: emits `loggedOn`.
- On failure: emits `error`.

**You must always call `logOff()` and wait for `disconnected` before calling `logOn()` again.**

### `logOff()`

Gracefully disconnects from Steam.

- If `steamID` is set (logged on): sends `ClientLogOff`, then emits `disconnected` either from the CM response or a 4-second fallback timeout. Sets `steamID = null` after `disconnected`.
- If `steamID` is null (not logged on): closes connection immediately. Does **not** emit `disconnected`.
- Intentional logoffs do **not** trigger auto-reconnect.

### `gamesPlayed(apps, force?)`

Tells Steam which games the account is playing.

- `apps`: array of AppIDs (numbers). `[730]` = CS2.
- `force`: if `true`, kicks any other session playing games on this account.
- Required for the Game Coordinator connection (`globaloffensive` library).

### `getPersonas(steamids)`

Requests persona (profile) data for the given SteamIDs. Triggers the `user` event for each result.

### `steamID` property

- `SteamID | null`. Set when logged on, `null` when not.
- Has `.toString()` returning the SteamID64 string.
- Set to `null` **after** the `error` event is emitted (not before).

---

## Events

### `loggedOn`

Fires after successful authentication (CM accepted the logon with `EResult.OK`).

**Callback:** `(details, parental)` -- `details` contains the raw logon response.

### `user`

Fires when persona data is received for any user.

**Callback:** `(steamID, user)`

Key `user` properties:

| Property | Type | Description |
|----------|------|-------------|
| `player_name` | `string` | Display name |
| `avatar_url_full` | `string` | Full-size avatar URL |
| `persona_state` | `EPersonaState` | Online status |
| `game_played_app_id` | `number\|null` | Currently played game |

Also emitted as `user#<steamid64>` for targeted listening.

### `error`

Fires on **fatal** errors that prevent continued operation.

**Callback:** `(err)` where `err` has:
- `message`: human-readable error (the EResult name, e.g. `"InvalidPassword"`)
- `eresult`: numeric EResult code

**Fatal vs non-fatal:** With `autoRelogin: true` (our default), only certain EResults are non-fatal and trigger `disconnected` instead:
- `0` (connection closed directly)
- `2` (Fail)
- `3` (NoConnection)
- `20` (ServiceUnavailable)
- `48` (TryAnotherCM)

Everything else is fatal and emits `error`.

**Important:** The `error` event **must** be handled. Unhandled `error` events crash Node.js.

### `disconnected`

Fires on **non-fatal** disconnections (when `autoRelogin: true`).

**Callback:** `(eresult, msg)`
- `eresult`: numeric code. `0` = connection closed directly (e.g. by `logOff()`).
- `msg`: string description.

After non-fatal disconnects (not from intentional `logOff()`), steam-user auto-enqueues reconnect with exponential backoff.

---

## EResult Codes

| Code | Name | Meaning |
|------|------|---------|
| 1 | `OK` | Success |
| 2 | `Fail` | Generic failure (non-fatal) |
| 3 | `NoConnection` | Connection lost (non-fatal) |
| **5** | **`InvalidPassword`** | Wrong password or **expired/invalidated refresh token** |
| 6 | `LoggedInElsewhere` | Another client logged in |
| **15** | **`AccessDenied`** | Token revoked, account locked |
| 20 | `ServiceUnavailable` | Steam servers temporarily unavailable (non-fatal) |
| **35** | **`ConnectFailed`** | Token rejected by CM |
| 43 | `AccountDisabled` | Account disabled |
| 48 | `TryAnotherCM` | CM overloaded (non-fatal) |
| 84 | `RateLimitExceeded` | Too many logon attempts |
| 85 | `AccountLoginDeniedNeedTwoFactor` | 2FA code required |
| 88 | `TwoFactorCodeMismatch` | Incorrect 2FA code |

Our `INVALID_TOKEN_ERESULTS` set `{5, 15, 35}` covers all cases where a saved refresh token is no longer valid. On these, we clear the stale token and remove account metadata.

---

## Event Flow Summary

**Successful login:**
```
logOn({ refreshToken })
  -> connects to CM -> ClientLogon -> EResult.OK
  -> emits 'loggedOn'
  -> (our code) gamesPlayed([730], true) + getPersonas()
  -> emits 'user' (persona data)
```

**Token expired/invalid:**
```
logOn({ refreshToken })
  -> connects to CM -> ClientLogon -> EResult 5/15/35
  -> emits 'error' with { eresult }
  -> steamID set to null
```

**Intentional logoff:**
```
logOff()
  -> ClientLogOff -> CM responds or 4s timeout
  -> emits 'disconnected' (eresult=0)
  -> NO auto-reconnect
  -> steamID set to null
```

**Transient disconnect:**
```
connection closes
  -> emits 'disconnected' (non-fatal eresult)
  -> steam-user auto-reconnects with backoff
  -> eventually emits 'loggedOn' or 'error'
```
