import type { AppModule } from '../AppModule.js';
import type { ModuleContext } from '../ModuleContext.js';
import { ipcMain, safeStorage, app } from 'electron';
import { broadcastToRenderers } from '../broadcastToRenderers.js';
import { join } from 'node:path';
import { readFile, writeFile, unlink, mkdir, access } from 'node:fs/promises';
import SteamUser from 'steam-user';
import GlobalOffensive from 'globaloffensive';
import { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } from 'steam-session';

import { resolveItem, getAttributeUint32, type ResolvedItemData } from 'cs2-inventory-resolver';

interface CredentialLoginArgs {
  username: string;
  password: string;
}

interface DepositArgs {
  storageId: string;
  itemIds: string[];
}

interface RetrieveArgs {
  storageId: string;
  itemIds: string[];
}

interface RenameArgs {
  storageId: string;
  name: string;
}

interface SavedAccountMeta {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  addedAt: number;
}

interface RawInventoryItem {
  id: string | number;
  classid?: string | number;
  instanceid?: string | number;
  def_index: number;
  paint_index?: number;
  quality?: number;
  origin?: number;
  rarity?: number;
  custom_name?: string;
  market_hash_name?: string;
  icon_url?: string;
  casket_id?: string;
  casket_contained_item_count?: number;
  stickers?: { sticker_id?: number }[];
  paint_wear?: number;
  tradable?: boolean;
  attribute?: { def_index: number; value_bytes?: Buffer }[];
  [key: string]: unknown;
}

const OPERATION_DELAY_MS = 500;
const OPERATION_TIMEOUT_MS = 5000;
const INVALID_TOKEN_ERESULTS = new Set([5, 15, 35]);

class SteamConnection implements AppModule {
  #steamUser: SteamUser;
  #csgo: GlobalOffensive;
  #loginSession: LoginSession | null = null;
  #activeSteamId: string | null = null;
  #operationCancelled = false;
  #suppressReconnect = false;

  constructor() {
    this.#steamUser = new SteamUser();
    this.#csgo = new GlobalOffensive(this.#steamUser);
  }

  enable({ app: electronApp }: ModuleContext): void {
    this.#registerIpcHandlers();
    this.#registerSteamEvents();

    electronApp.on('before-quit', () => {
      if (this.#steamUser.steamID) {
        this.#steamUser.logOff();
      }
    });
  }

  #registerIpcHandlers() {
    ipcMain.handle('steam:credential-login', (_e, creds: CredentialLoginArgs) =>
      this.#credentialLogin(creds),
    );
    ipcMain.handle('steam:submit-steam-guard', (_e, code: string) => this.#submitSteamGuard(code));
    ipcMain.handle('steam:logout', () => this.#logout());
    ipcMain.handle('steam:try-saved-session', () => this.#trySavedSession());
    ipcMain.handle('steam:get-saved-accounts', () => this.#getSavedAccounts());
    ipcMain.handle('steam:switch-account', (_e, steamId: string) => this.#switchAccount(steamId));
    ipcMain.handle('steam:remove-account', (_e, steamId: string) => this.#removeAccount(steamId));
    ipcMain.handle('steam:get-inventory', () => this.#getInventory());
    ipcMain.handle('steam:get-storage-units', () => this.#getStorageUnits());
    ipcMain.handle('steam:inspect-storage', (_e, id: string) => this.#inspectStorage(id));
    ipcMain.handle('steam:deposit-to-storage', (_e, args: DepositArgs) =>
      this.#depositToStorage(args),
    );
    ipcMain.handle('steam:retrieve-from-storage', (_e, args: RetrieveArgs) =>
      this.#retrieveFromStorage(args),
    );
    ipcMain.handle('steam:rename-storage', (_e, args: RenameArgs) => this.#renameStorage(args));
    ipcMain.handle('steam:cancel-operation', () => {
      this.#operationCancelled = true;
    });
  }

  #registerSteamEvents() {
    this.#steamUser.on('loggedOn', () => {
      broadcastToRenderers('steam:auth-state', { state: 'connected' });
      this.#steamUser.gamesPlayed([730], true);

      // Explicitly request our own persona data so the 'user' event fires
      if (this.#steamUser.steamID) {
        this.#activeSteamId = this.#steamUser.steamID.toString();
        this.#steamUser.getPersonas([this.#steamUser.steamID]);
      }
    });

    this.#steamUser.on(
      'user',
      async (sid: { toString(): string }, user: Record<string, unknown>) => {
        if (sid.toString() === this.#steamUser.steamID?.toString()) {
          const info = {
            steamId: sid.toString(),
            personaName: user.player_name as string,
            avatarUrl: (user.avatar_url_full as string) ?? '',
          };
          broadcastToRenderers('steam:user-info', info);

          // Update saved account meta with fresh persona info
          await this.#upsertAccountMeta({
            steamId: info.steamId,
            personaName: info.personaName,
            avatarUrl: info.avatarUrl,
            addedAt: Date.now(),
          });
          broadcastToRenderers('steam:saved-accounts-updated', await this.#loadAccountsMeta());
        }
      },
    );

    this.#steamUser.on('error', async (err: Error & { eresult?: number }) => {
      broadcastToRenderers('steam:error', { message: err.message, code: err.eresult });
      broadcastToRenderers('steam:auth-state', { state: 'error', error: err.message });

      // Auto-clean stale tokens on invalid token errors
      if (err.eresult && INVALID_TOKEN_ERESULTS.has(err.eresult) && this.#activeSteamId) {
        await this.#clearRefreshTokenForAccount(this.#activeSteamId);
        await this.#removeAccountMeta(this.#activeSteamId);
        await this.#clearLastAccount();
        this.#activeSteamId = null;
        broadcastToRenderers('steam:saved-accounts-updated', await this.#loadAccountsMeta());
      }
    });

    this.#steamUser.on('disconnected', (_eresult: number, msg?: string) => {
      broadcastToRenderers('steam:auth-state', { state: 'disconnected' });

      // Attempt automatic reconnection if we have a saved token
      if (this.#activeSteamId && !this.#suppressReconnect) {
        console.log(`Disconnected (${msg ?? 'unknown'}), attempting reconnection...`);
        this.#attemptReconnect(this.#activeSteamId);
      }
    });

    this.#csgo.on('connectedToGC', () => {
      this.#sendInventoryUpdate();
    });

    this.#csgo.on('itemAcquired', () => {
      this.#sendInventoryUpdate();
    });

    this.#csgo.on('itemRemoved', () => {
      this.#sendInventoryUpdate();
    });

    this.#csgo.on('itemChanged', () => {
      this.#sendInventoryUpdate();
    });
  }

  // --- Multi-account storage paths ---

  #getAccountsPath(): string {
    return join(app.getPath('userData'), 'accounts.json');
  }

  #getTokenDir(): string {
    return join(app.getPath('userData'), 'tokens');
  }

  #getTokenPathForAccount(steamId: string): string {
    return join(this.#getTokenDir(), `${steamId}.enc`);
  }

  #getLastAccountPath(): string {
    return join(app.getPath('userData'), 'last-account.txt');
  }

  #getLegacyTokenPath(): string {
    return join(app.getPath('userData'), 'session.enc');
  }

  // --- Account metadata ---

  async #loadAccountsMeta(): Promise<SavedAccountMeta[]> {
    try {
      const data = await readFile(this.#getAccountsPath(), 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async #saveAccountsMeta(accounts: SavedAccountMeta[]): Promise<void> {
    try {
      await writeFile(this.#getAccountsPath(), JSON.stringify(accounts, null, 2), 'utf-8');
    } catch (err: unknown) {
      console.error('Failed to save accounts metadata:', err instanceof Error ? err.message : err);
    }
  }

  async #upsertAccountMeta(meta: SavedAccountMeta): Promise<void> {
    const accounts = await this.#loadAccountsMeta();
    const idx = accounts.findIndex(a => a.steamId === meta.steamId);
    if (idx >= 0) {
      // Preserve original addedAt
      accounts[idx] = { ...meta, addedAt: accounts[idx].addedAt };
    } else {
      accounts.push(meta);
    }
    await this.#saveAccountsMeta(accounts);
  }

  async #removeAccountMeta(steamId: string): Promise<void> {
    const accounts = await this.#loadAccountsMeta();
    const filtered = accounts.filter(a => a.steamId !== steamId);
    await this.#saveAccountsMeta(filtered);
  }

  // --- Per-account token storage ---

  async #saveRefreshTokenForAccount(steamId: string, token: string): Promise<void> {
    try {
      if (!safeStorage.isEncryptionAvailable()) return;
      const encrypted = safeStorage.encryptString(token);
      await mkdir(this.#getTokenDir(), { recursive: true });
      await writeFile(this.#getTokenPathForAccount(steamId), encrypted);
    } catch (err: unknown) {
      console.error('Failed to save refresh token:', err instanceof Error ? err.message : err);
      broadcastToRenderers('steam:error', { message: 'Failed to save login token' });
    }
  }

  async #loadRefreshTokenForAccount(steamId: string): Promise<string | null> {
    try {
      if (!safeStorage.isEncryptionAvailable()) return null;
      const encrypted = await readFile(this.#getTokenPathForAccount(steamId));
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  }

  async #clearRefreshTokenForAccount(steamId: string): Promise<void> {
    try {
      await unlink(this.#getTokenPathForAccount(steamId));
    } catch {
      // Already gone or never existed
    }
  }

  // --- Last account ---

  async #saveLastAccount(steamId: string): Promise<void> {
    try {
      await writeFile(this.#getLastAccountPath(), steamId, 'utf-8');
    } catch {
      // Non-fatal
    }
  }

  async #loadLastAccount(): Promise<string | null> {
    try {
      return (await readFile(this.#getLastAccountPath(), 'utf-8')).trim();
    } catch {
      return null;
    }
  }

  async #clearLastAccount(): Promise<void> {
    try {
      await unlink(this.#getLastAccountPath());
    } catch {
      // Already gone
    }
  }

  // --- JWT helper ---

  #extractSteamIdFromToken(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  // --- Legacy migration ---

  async #migrateLegacySession(): Promise<void> {
    const legacyPath = this.#getLegacyTokenPath();
    try {
      await access(legacyPath);
    } catch {
      return; // No legacy file
    }

    try {
      if (!safeStorage.isEncryptionAvailable()) return;
      const encrypted = await readFile(legacyPath);
      const token = safeStorage.decryptString(encrypted);
      const steamId = this.#extractSteamIdFromToken(token);
      if (steamId) {
        await this.#saveRefreshTokenForAccount(steamId, token);
        await this.#upsertAccountMeta({
          steamId,
          personaName: steamId, // Will be updated on login
          avatarUrl: '',
          addedAt: Date.now(),
        });
        await this.#saveLastAccount(steamId);
      }
      await unlink(legacyPath);
    } catch {
      // Migration failed, leave legacy file
    }
  }

  // --- Logoff helper ---

  /**
   * Ensures steam-user is fully logged off before returning.
   * Waits for the 'disconnected' event so internal state is fully reset.
   */
  #logOffCurrent(): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.#steamUser.steamID) {
        // Not logged on — force logOff anyway to clear any lingering connecting state
        this.#steamUser.logOff();
        resolve();
        return;
      }
      this.#steamUser.once('disconnected', () => resolve());
      this.#steamUser.logOff();
    });
  }

  // --- Reconnect ---

  async #attemptReconnect(steamId: string) {
    const token = await this.#loadRefreshTokenForAccount(steamId);
    if (!token) return;

    try {
      broadcastToRenderers('steam:auth-state', { state: 'connecting' });
      this.#steamUser.logOn({ refreshToken: token });
    } catch {
      broadcastToRenderers('steam:auth-state', { state: 'disconnected' });
    }
  }

  // --- Session ---

  async #trySavedSession(): Promise<boolean> {
    // Migrate legacy session.enc if present
    await this.#migrateLegacySession();

    const lastSteamId = await this.#loadLastAccount();
    if (!lastSteamId) return false;

    const token = await this.#loadRefreshTokenForAccount(lastSteamId);
    if (!token) return false;

    try {
      this.#activeSteamId = lastSteamId;
      broadcastToRenderers('steam:auth-state', { state: 'connecting' });
      this.#steamUser.logOn({ refreshToken: token });
      return true;
    } catch {
      await this.#clearRefreshTokenForAccount(lastSteamId);
      await this.#removeAccountMeta(lastSteamId);
      await this.#clearLastAccount();
      this.#activeSteamId = null;
      broadcastToRenderers('steam:auth-state', { state: 'disconnected' });
      broadcastToRenderers('steam:saved-accounts-updated', await this.#loadAccountsMeta());
      return false;
    }
  }

  // --- Auth ---

  async #credentialLogin({ username, password }: CredentialLoginArgs) {
    try {
      // Log off current user without deleting their token
      this.#suppressReconnect = true;
      await this.#logOffCurrent();
      this.#suppressReconnect = false;

      this.#loginSession = new LoginSession(EAuthTokenPlatformType.SteamClient);

      this.#loginSession.on('authenticated', async () => {
        const refreshToken = this.#loginSession!.refreshToken;
        const steamId = this.#extractSteamIdFromToken(refreshToken);

        if (steamId) {
          await this.#saveRefreshTokenForAccount(steamId, refreshToken);
          await this.#upsertAccountMeta({
            steamId,
            personaName: username,
            avatarUrl: '',
            addedAt: Date.now(),
          });
          await this.#saveLastAccount(steamId);
          this.#activeSteamId = steamId;
          broadcastToRenderers('steam:saved-accounts-updated', await this.#loadAccountsMeta());
        }

        this.#steamUser.logOn({ refreshToken });
      });

      this.#loginSession.on('error', (err: Error) => {
        broadcastToRenderers('steam:error', { message: err.message });
      });

      const startResult = await this.#loginSession.startWithCredentials({
        accountName: username,
        password,
      });

      if (startResult.actionRequired) {
        const guard = startResult.validActions?.find(
          a =>
            a.type === EAuthSessionGuardType.EmailCode ||
            a.type === EAuthSessionGuardType.DeviceCode,
        );

        if (guard) {
          const guardType = guard.type === EAuthSessionGuardType.EmailCode ? 'email' : 'mobile';
          broadcastToRenderers('steam:steam-guard-required', { type: guardType });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      broadcastToRenderers('steam:error', { message });
      broadcastToRenderers('steam:auth-state', { state: 'error', error: message });
    }
  }

  async #submitSteamGuard(code: string) {
    if (this.#loginSession) {
      try {
        await this.#loginSession.submitSteamGuardCode(code);
      } catch (err: unknown) {
        broadcastToRenderers('steam:error', {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  async #logout() {
    const steamId = this.#activeSteamId;
    this.#steamUser.logOff();
    if (steamId) {
      await this.#clearRefreshTokenForAccount(steamId);
      await this.#removeAccountMeta(steamId);
      await this.#clearLastAccount();
      this.#activeSteamId = null;
      broadcastToRenderers('steam:saved-accounts-updated', await this.#loadAccountsMeta());
    }
    broadcastToRenderers('steam:auth-state', { state: 'disconnected' });
  }

  // --- Multi-account IPC handlers ---

  async #getSavedAccounts(): Promise<SavedAccountMeta[]> {
    return this.#loadAccountsMeta();
  }

  async #switchAccount(steamId: string): Promise<boolean> {
    const token = await this.#loadRefreshTokenForAccount(steamId);
    if (!token) {
      await this.#removeAccountMeta(steamId);
      broadcastToRenderers('steam:saved-accounts-updated', await this.#loadAccountsMeta());
      broadcastToRenderers('steam:error', { message: 'No saved token for this account' });
      return false;
    }

    // Prepare before logoff so there is no await between logOff and logOn
    this.#activeSteamId = steamId;
    await this.#saveLastAccount(steamId);

    try {
      this.#suppressReconnect = true;
      await this.#logOffCurrent();
      broadcastToRenderers('steam:auth-state', { state: 'connecting' });
      this.#steamUser.logOn({ refreshToken: token });
      return true;
    } catch {
      broadcastToRenderers('steam:auth-state', {
        state: 'error',
        error: 'Failed to switch account',
      });
      return false;
    } finally {
      this.#suppressReconnect = false;
    }
  }

  async #removeAccount(steamId: string): Promise<void> {
    // If removing the active account, log off
    if (this.#activeSteamId === steamId && this.#steamUser.steamID) {
      this.#steamUser.logOff();
      this.#activeSteamId = null;
      await this.#clearLastAccount();
      broadcastToRenderers('steam:auth-state', { state: 'disconnected' });
    }

    await this.#clearRefreshTokenForAccount(steamId);
    await this.#removeAccountMeta(steamId);
    broadcastToRenderers('steam:saved-accounts-updated', await this.#loadAccountsMeta());
  }

  // --- Inventory ---

  // IDs known to be non-movable system items (from casemove)
  static #EXCLUDED_IDS = new Set(['17293822569110896676', '17293822569102708641']);

  #getInventory() {
    const inventory = this.#csgo.inventory;
    if (!inventory || inventory.length === 0) return [];

    const result = [];
    for (const item of inventory) {
      if (item.def_index === 1201) continue; // Storage units
      if (item.casket_id) continue; // Items inside a storage unit
      if (SteamConnection.#EXCLUDED_IDS.has(String(item.id))) continue; // Known system items
      if (getAttributeUint32(item, 277) === 1) continue; // Free reward items

      const { _resolved, ...formatted } = this.#formatItem(item);
      result.push({ ...formatted, movable: this.#isItemMovable(item, _resolved) });
    }
    return result;
  }

  /**
   * Determines if an item can be moved to/from a storage unit.
   * Based on casemove's itemProcessorCanBeMoved logic.
   */
  #isItemMovable(item: RawInventoryItem, resolved: ResolvedItemData | null): boolean {
    // ★ items (quality 3, e.g. knives/gloves) are always movable
    if (item.quality === 3) return true;

    // Collectibles (coins, service medals, pins) are generally non-movable
    if (resolved?.category === 'collectible') return false;

    // Promotional music kits (origin 0 = timed drop for default music kit)
    if (resolved?.category === 'music_kit' && item.origin === 0) return false;

    // Unresolved items with no paint are base/stock weapons
    if (!resolved && !item.paint_index) return false;

    return true;
  }

  #getStorageUnits() {
    const inventory = this.#csgo.inventory;
    if (!inventory || inventory.length === 0) return [];
    return inventory
      .filter((item: RawInventoryItem) => item.def_index === 1201)
      .map((item: RawInventoryItem) => ({
        id: String(item.id),
        name: item.custom_name || 'Storage Unit',
        item_count: item.casket_contained_item_count ?? 0,
        custom_name: item.custom_name || null,
      }));
  }

  #inspectStorage(id: string) {
    return new Promise((resolve, reject) => {
      this.#csgo.getCasketContents(id, (err: Error | null, items: RawInventoryItem[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve((items || []).map((item: RawInventoryItem) => this.#formatItem(item)));
      });
    });
  }

  async #depositToStorage({ storageId, itemIds }: DepositArgs) {
    this.#operationCancelled = false;
    try {
      for (let i = 0; i < itemIds.length; i++) {
        if (this.#operationCancelled) {
          broadcastToRenderers('steam:operation-complete', {
            success: false,
            error: 'Operation cancelled',
          });
          return;
        }

        const itemId = itemIds[i];
        broadcastToRenderers('steam:operation-progress', {
          current: i + 1,
          total: itemIds.length,
          itemId,
        });

        await new Promise<void>(resolve => {
          this.#csgo.addToCasket(storageId, itemId);
          const timeout = setTimeout(() => resolve(), OPERATION_TIMEOUT_MS);
          const handler = () => {
            clearTimeout(timeout);
            resolve();
          };
          this.#csgo.once('itemRemoved', handler);
          this.#csgo.once('itemCustomizationNotification', handler);
        });

        if (i < itemIds.length - 1) {
          await this.#delay(OPERATION_DELAY_MS);
        }
      }

      broadcastToRenderers('steam:operation-complete', { success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Deposit operation failed:', message);
      broadcastToRenderers('steam:operation-complete', { success: false, error: message });
    }
    this.#sendInventoryUpdate();
  }

  async #retrieveFromStorage({ storageId, itemIds }: RetrieveArgs) {
    this.#operationCancelled = false;
    try {
      for (let i = 0; i < itemIds.length; i++) {
        if (this.#operationCancelled) {
          broadcastToRenderers('steam:operation-complete', {
            success: false,
            error: 'Operation cancelled',
          });
          return;
        }

        const itemId = itemIds[i];
        broadcastToRenderers('steam:operation-progress', {
          current: i + 1,
          total: itemIds.length,
          itemId,
        });

        await new Promise<void>(resolve => {
          this.#csgo.removeFromCasket(storageId, itemId);
          const timeout = setTimeout(() => resolve(), OPERATION_TIMEOUT_MS);
          const handler = () => {
            clearTimeout(timeout);
            resolve();
          };
          this.#csgo.once('itemAcquired', handler);
          this.#csgo.once('itemCustomizationNotification', handler);
        });

        if (i < itemIds.length - 1) {
          await this.#delay(OPERATION_DELAY_MS);
        }
      }

      broadcastToRenderers('steam:operation-complete', { success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Retrieve operation failed:', message);
      broadcastToRenderers('steam:operation-complete', { success: false, error: message });
    }
    this.#sendInventoryUpdate();
  }

  async #renameStorage({ storageId, name }: RenameArgs) {
    return new Promise<void>(resolve => {
      this.#csgo.nameItem(0, storageId, name);
      const timeout = setTimeout(() => resolve(), 2000);
      this.#csgo.once('itemChanged', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  #formatItem(item: RawInventoryItem) {
    const defIndex = item.def_index ?? 0;
    const paintIndex = item.paint_index ?? 0;

    const resolved = resolveItem(item);

    return {
      id: String(item.id),
      classid: String(item.classid ?? ''),
      instanceid: String(item.instanceid ?? ''),
      name: resolved?.name || item.market_hash_name || item.custom_name || `Item #${defIndex}`,
      market_hash_name: item.market_hash_name || resolved?.name || '',
      image: resolved?.image || item.icon_url || '',
      tradable: item.tradable ?? false,
      def_index: defIndex,
      paint_index: paintIndex,
      rarity: item.rarity?.toString() ?? '',
      rarity_color: '',
      quality: item.quality?.toString() ?? '',
      paint_wear: item.paint_wear ?? null,
      custom_name: item.custom_name || null,
      stickers: item.stickers || [],
      _resolved: resolved, // Used internally for movability check, stripped before sending
    };
  }

  #sendInventoryUpdate() {
    const items = this.#getInventory();
    broadcastToRenderers('steam:inventory-updated', items);
    const units = this.#getStorageUnits();
    broadcastToRenderers('steam:storage-units-updated', units);
  }

  #delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createSteamConnection() {
  return new SteamConnection();
}
