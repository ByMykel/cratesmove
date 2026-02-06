import type {AppModule} from '../AppModule.js';
import type {ModuleContext} from '../ModuleContext.js';
import {BrowserWindow, ipcMain, safeStorage, app} from 'electron';
import {join} from 'node:path';
import {readFile, writeFile, unlink, mkdir} from 'node:fs/promises';
import SteamUser from 'steam-user';
import GlobalOffensive from 'globaloffensive';
import {LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType} from 'steam-session';
import SteamTotp from 'steam-totp';
import {loadItemData, resolveItem} from './ItemDataService.js';

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

const OPERATION_DELAY_MS = 500;

class SteamConnection implements AppModule {
  #steamUser: SteamUser;
  #csgo: GlobalOffensive;
  #loginSession: LoginSession | null = null;

  constructor() {
    this.#steamUser = new SteamUser();
    this.#csgo = new GlobalOffensive(this.#steamUser);
  }

  enable({app: electronApp}: ModuleContext): void {
    this.#registerIpcHandlers();
    this.#registerSteamEvents();

    electronApp.on('before-quit', () => {
      if (this.#steamUser.steamID) {
        this.#steamUser.logOff();
      }
    });
  }

  #registerIpcHandlers() {
    ipcMain.handle('steam:credential-login', (_e, creds: CredentialLoginArgs) => this.#credentialLogin(creds));
    ipcMain.handle('steam:submit-steam-guard', (_e, code: string) => this.#submitSteamGuard(code));
    ipcMain.handle('steam:logout', () => this.#logout());
    ipcMain.handle('steam:try-saved-session', () => this.#trySavedSession());
    ipcMain.handle('steam:get-inventory', () => this.#getInventory());
    ipcMain.handle('steam:get-storage-units', () => this.#getStorageUnits());
    ipcMain.handle('steam:inspect-storage', (_e, id: string) => this.#inspectStorage(id));
    ipcMain.handle('steam:deposit-to-storage', (_e, args: DepositArgs) => this.#depositToStorage(args));
    ipcMain.handle('steam:retrieve-from-storage', (_e, args: RetrieveArgs) => this.#retrieveFromStorage(args));
    ipcMain.handle('steam:rename-storage', (_e, args: RenameArgs) => this.#renameStorage(args));
  }

  #registerSteamEvents() {
    this.#steamUser.on('loggedOn', () => {
      this.#sendToRenderer('steam:auth-state', {state: 'connected'});
      this.#steamUser.gamesPlayed([730], true);

      // Explicitly request our own persona data so the 'user' event fires
      if (this.#steamUser.steamID) {
        this.#steamUser.getPersonas([this.#steamUser.steamID]);
      }
    });

    this.#steamUser.on('user', (sid, user) => {
      if (sid.toString() === this.#steamUser.steamID?.toString()) {
        this.#sendToRenderer('steam:user-info', {
          steamId: sid.toString(),
          personaName: user.player_name,
          avatarUrl: user.avatar_url_full ?? '',
        });
      }
    });

    this.#steamUser.on('error', (err) => {
      this.#sendToRenderer('steam:error', {message: err.message, code: (err as any).eresult});
      this.#sendToRenderer('steam:auth-state', {state: 'error', error: err.message});
    });

    this.#steamUser.on('disconnected', () => {
      this.#sendToRenderer('steam:auth-state', {state: 'disconnected'});
    });

    this.#csgo.on('connectedToGC', async () => {
      console.log('[SteamConnection] Connected to GC, inventory length:', this.#csgo.inventory?.length ?? 0);
      await loadItemData();
      console.log('[SteamConnection] Item data loaded, inventory length:', this.#csgo.inventory?.length ?? 0);
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

  // --- Session persistence ---

  #getTokenPath(): string {
    return join(app.getPath('userData'), 'session.enc');
  }

  async #saveRefreshToken(token: string): Promise<void> {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        return;
      }
      const encrypted = safeStorage.encryptString(token);
      const dir = app.getPath('userData');
      await mkdir(dir, {recursive: true});
      await writeFile(this.#getTokenPath(), encrypted);
    } catch {
      // Non-fatal — user will just have to log in again next time
    }
  }

  async #loadRefreshToken(): Promise<string | null> {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        return null;
      }
      const encrypted = await readFile(this.#getTokenPath());
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  }

  async #clearRefreshToken(): Promise<void> {
    try {
      await unlink(this.#getTokenPath());
    } catch {
      // Already gone or never existed
    }
  }

  async #trySavedSession(): Promise<boolean> {
    const token = await this.#loadRefreshToken();
    if (!token) return false;

    try {
      this.#sendToRenderer('steam:auth-state', {state: 'connecting'});
      this.#steamUser.logOn({refreshToken: token});
      return true;
    } catch (err: any) {
      await this.#clearRefreshToken();
      this.#sendToRenderer('steam:auth-state', {state: 'disconnected'});
      return false;
    }
  }

  // --- Auth ---

  async #credentialLogin({username, password}: CredentialLoginArgs) {
    try {
      this.#loginSession = new LoginSession(EAuthTokenPlatformType.SteamClient);

      this.#loginSession.on('authenticated', async () => {
        const refreshToken = this.#loginSession!.refreshToken;
        await this.#saveRefreshToken(refreshToken);
        this.#steamUser.logOn({refreshToken});
      });

      this.#loginSession.on('error', (err: Error) => {
        this.#sendToRenderer('steam:error', {message: err.message});
      });

      const startResult = await this.#loginSession.startWithCredentials({
        accountName: username,
        password,
      });

      if (startResult.actionRequired) {
        const guard = startResult.validActions?.find(
          a => a.type === EAuthSessionGuardType.EmailCode || a.type === EAuthSessionGuardType.DeviceCode,
        );

        if (guard) {
          const guardType = guard.type === EAuthSessionGuardType.EmailCode ? 'email' : 'mobile';
          this.#sendToRenderer('steam:steam-guard-required', {type: guardType});
        }
      }
    } catch (err: any) {
      this.#sendToRenderer('steam:error', {message: err.message});
      this.#sendToRenderer('steam:auth-state', {state: 'error', error: err.message});
    }
  }

  async #submitSteamGuard(code: string) {
    if (this.#loginSession) {
      try {
        await this.#loginSession.submitSteamGuardCode(code);
      } catch (err: any) {
        this.#sendToRenderer('steam:error', {message: err.message});
      }
    }
  }

  async #logout() {
    this.#steamUser.logOff();
    await this.#clearRefreshToken();
    this.#sendToRenderer('steam:auth-state', {state: 'disconnected'});
  }

  // --- Inventory ---

  #getInventory() {
    const inventory = this.#csgo.inventory;
    if (!inventory || inventory.length === 0) return [];

    // Send raw GC items to renderer for debugging (visible in DevTools console)
    const rawDump = inventory.map((item: any) => JSON.parse(JSON.stringify(item, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    )));
    this.#sendToRenderer('steam:debug-raw-inventory', rawDump);

    const filtered = inventory.filter((item: any) => item.def_index !== 1201);
    return filtered.map((item: any) => this.#formatItem(item));
  }

  #getStorageUnits() {
    const inventory = this.#csgo.inventory;
    if (!inventory || inventory.length === 0) return [];
    return inventory
      .filter((item: any) => item.def_index === 1201)
      .map((item: any) => ({
        id: String(item.id),
        name: item.custom_name || 'Storage Unit',
        item_count: item.casket_item_count ?? 0,
        custom_name: item.custom_name || null,
      }));
  }

  #inspectStorage(id: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.#csgo.getCasketContents(BigInt(id), (err: Error | null, items: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve((items || []).map((item: any) => this.#formatItem(item)));
      });
    });
  }

  async #depositToStorage({storageId, itemIds}: DepositArgs) {
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      this.#sendToRenderer('steam:operation-progress', {
        current: i + 1,
        total: itemIds.length,
        itemId,
      });

      await new Promise<void>((resolve, reject) => {
        this.#csgo.addToCasket(BigInt(storageId), BigInt(itemId));
        const timeout = setTimeout(() => resolve(), OPERATION_DELAY_MS + 1000);
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

    this.#sendToRenderer('steam:operation-complete', {success: true});
    this.#sendInventoryUpdate();
  }

  async #retrieveFromStorage({storageId, itemIds}: RetrieveArgs) {
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      this.#sendToRenderer('steam:operation-progress', {
        current: i + 1,
        total: itemIds.length,
        itemId,
      });

      await new Promise<void>((resolve, reject) => {
        this.#csgo.removeFromCasket(BigInt(storageId), BigInt(itemId));
        const timeout = setTimeout(() => resolve(), OPERATION_DELAY_MS + 1000);
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

    this.#sendToRenderer('steam:operation-complete', {success: true});
    this.#sendInventoryUpdate();
  }

  async #renameStorage({storageId, name}: RenameArgs) {
    this.#csgo.nameItem(BigInt(storageId), name);
  }

  #getAttributeUint32(item: any, attrDefIndex: number): number | undefined {
    const attrib = (item.attribute || []).find((a: any) => a.def_index === attrDefIndex);
    if (!attrib?.value_bytes) return undefined;
    // value_bytes is a Buffer at runtime, but serializes as {type: "Buffer", data: [...]}
    const buf = Buffer.isBuffer(attrib.value_bytes)
      ? attrib.value_bytes
      : Buffer.from(attrib.value_bytes.data || []);
    if (buf.length < 4) return undefined;
    return buf.readUInt32LE(0);
  }

  #formatItem(item: any) {
    const defIndex = item.def_index ?? 0;
    const paintIndex = item.paint_index ?? 0;

    // Extract attributes from raw attribute[] array
    const musicIndex = this.#getAttributeUint32(item, 166);
    const graffitiTint = this.#getAttributeUint32(item, 233);
    const keychainIndex = this.#getAttributeUint32(item, 299);

    const resolved = resolveItem({
      def_index: defIndex,
      paint_index: paintIndex,
      music_index: musicIndex,
      graffiti_tint: graffitiTint,
      keychain_index: keychainIndex,
      stickers: item.stickers,
    });

    if (!resolved) {
      console.warn(`[SteamConnection] Could not resolve item: id=${item.id}, def_index=${defIndex}, paint_index=${paintIndex}`);
    }

    return {
      id: String(item.id),
      classid: String(item.classid ?? ''),
      instanceid: String(item.instanceid ?? ''),
      name: resolved?.name || item.market_hash_name || item.custom_name || `Item #${defIndex}`,
      market_hash_name: item.market_hash_name || resolved?.name || '',
      icon_url: resolved?.image || item.icon_url || '',
      tradable: item.tradable ?? false,
      def_index: defIndex,
      paint_index: paintIndex,
      rarity: item.rarity?.toString() ?? '',
      rarity_color: '',
      quality: item.quality?.toString() ?? '',
      paint_wear: item.paint_wear ?? null,
      custom_name: item.custom_name || null,
      stickers: item.stickers || [],
    };
  }

  #sendInventoryUpdate() {
    const items = this.#getInventory();
    this.#sendToRenderer('steam:inventory-updated', items);
    const units = this.#getStorageUnits();
    this.#sendToRenderer('steam:storage-units-updated', units);
  }

  #sendToRenderer(channel: string, data: unknown) {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    }
  }

  #delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createSteamConnection() {
  return new SteamConnection();
}
