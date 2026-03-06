# `steam-session` Library Reference (v1.x)

> Used in `packages/main/src/modules/SteamConnection.ts`

## Overview

`steam-session` handles Steam's authentication flow (credential login + Steam Guard 2FA). It communicates with the Steam login server and produces JWT refresh/access tokens. Those tokens are then passed to `steam-user`'s `logOn({ refreshToken })` to establish the actual Steam client connection.

**Two-stage auth flow:**
1. `steam-session` authenticates credentials + 2FA -> produces `refreshToken`
2. `steam-user` uses `refreshToken` to connect to Steam CM

---

## Classes and Enums

### `LoginSession`

Represents a single login attempt.

```ts
new LoginSession(EAuthTokenPlatformType.SteamClient)
```

**Key properties:**

| Property | Type | Description |
|----------|------|-------------|
| `refreshToken` | `string` | JWT refresh token, populated when `authenticated` fires |
| `accessToken` | `string` | JWT access token, populated when `authenticated` fires |
| `steamID` | `SteamID` | SteamID of the authenticating user |
| `loginTimeout` | `number` | Timeout in ms before the login attempt is abandoned |

### `EAuthTokenPlatformType`

| Member | Value | Token Audiences |
|--------|-------|-----------------|
| `SteamClient` | `1` | `['web', 'client']` -- **what we use** |
| `WebBrowser` | `2` | `['web']` |
| `MobileApp` | `3` | `['web', 'mobile']` |

We use `SteamClient` because `steam-user` requires tokens with the `client` audience.

### `EAuthSessionGuardType`

| Member | Value | Description |
|--------|-------|-------------|
| `None` | `1` | No guard required |
| `EmailCode` | `2` | Code sent to email |
| `DeviceCode` | `3` | TOTP code from Steam mobile authenticator |
| `DeviceConfirmation` | `4` | Confirm in Steam mobile app (no code needed) |
| `EmailConfirmation` | `5` | Confirm via email link |
| `MachineToken` | `6` | Machine token bypasses guard |

Our code checks for `EmailCode` and `DeviceCode` -- the two types requiring user to enter a code.

---

## Methods

### `startWithCredentials({ accountName, password })`

```ts
const startResult = await loginSession.startWithCredentials({
  accountName: string,
  password: string,
  steamGuardMachineToken?: string,  // optional, bypass email guard
  steamGuardCode?: string,          // optional, pre-supply 2FA code
});
```

**Returns:**

```ts
{
  actionRequired: boolean,
  validActions?: Array<{
    type: EAuthSessionGuardType,
    detail?: string  // e.g. masked email "s****@g***l.com"
  }>
}
```

- Resolves **before** authentication is complete.
- Starts internal polling automatically.
- The `authenticated` event fires later, asynchronously.

### `submitSteamGuardCode(code)`

Submits a Steam Guard code (email or TOTP). Rejects if the code is wrong.

After submission, polling continues and `authenticated` fires on success.

---

## Events

### `authenticated`

Fires when login succeeds and tokens are available (`refreshToken`, `accessToken` are populated).

**Always fires asynchronously** -- never during `await startWithCredentials()`. Even when no guard is required, polling is deferred via `setImmediate()`.

### `error`

Fires on errors during polling (network, rate limiting, etc.).

### `timeout`

Fires when `loginTimeout` elapses without successful authentication.

---

## Auth Flows

### User WITHOUT Steam Guard

1. `startWithCredentials()` resolves with `{ actionRequired: false }`
2. Polling starts via `setImmediate()`
3. `authenticated` fires asynchronously (after `startWithCredentials` has resolved)
4. Our code calls `steamUser.logOn({ refreshToken })`

### User WITH Email Guard

1. `startWithCredentials()` resolves with:
   ```ts
   {
     actionRequired: true,
     validActions: [{ type: EAuthSessionGuardType.EmailCode, detail: "s****@g***l.com" }]
   }
   ```
2. Our code broadcasts `steam:steam-guard-required` with `{ type: 'email' }`
3. User enters the code -> `submitSteamGuardCode(code)`
4. `authenticated` fires -> `steamUser.logOn({ refreshToken })`

### User WITH Mobile Authenticator

1. `startWithCredentials()` resolves with:
   ```ts
   {
     actionRequired: true,
     validActions: [{ type: EAuthSessionGuardType.DeviceCode }]
   }
   ```
2. Our code broadcasts `steam:steam-guard-required` with `{ type: 'mobile' }`
3. User enters TOTP code -> `submitSteamGuardCode(code)`
4. `authenticated` fires -> `steamUser.logOn({ refreshToken })`

**Note:** `validActions` may contain multiple entries (e.g. both `DeviceCode` and `DeviceConfirmation`). Our code uses `.find()` to pick the first `EmailCode` or `DeviceCode`.

---

## Key Behaviors

### `authenticated` Never Fires During `startWithCredentials()`

Even with no Steam Guard, the event is deferred. This is why our code registers the `authenticated` listener **before** calling `startWithCredentials` -- the listener must be in place before the event fires.

### Refresh Token Lifetime

Refresh tokens are valid for approximately 200 days. The token's JWT payload contains the SteamID in the `sub` claim, which we extract with `#extractSteamIdFromToken()`.

### Token -> `steam-user` Handoff

```
steam-session (credentials + 2FA)
  -> authenticated event
  -> loginSession.refreshToken (JWT)
  -> steamUser.logOn({ refreshToken })
  -> steam-user connects to CM
  -> loggedOn event
```

Saved tokens allow skipping `steam-session` entirely on subsequent launches -- go straight to `steamUser.logOn({ refreshToken })`.
