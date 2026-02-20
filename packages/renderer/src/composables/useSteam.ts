import { ref, readonly } from 'vue';
import {
  onSteamEvent,
  steamCredentialLogin,
  steamSubmitSteamGuard,
  steamLogout,
  steamTrySavedSession,
  steamGetSavedAccounts,
  steamSwitchAccount,
  steamRemoveAccount,
} from '@app/preload';
import type { AuthState, UserInfo, SavedAccountMeta } from '@/types/steam';
import { useInventoryStore } from '@/composables/useInventoryStore';

const authState = ref<AuthState>('disconnected');
const userInfo = ref<UserInfo | null>(null);
const error = ref<string | null>(null);
const steamGuardType = ref<'email' | 'mobile' | null>(null);
const isConnected = ref(false);
const restoringSession = ref(false);
const savedAccounts = ref<SavedAccountMeta[]>([]);
const switchingAccount = ref(false);

let listenersRegistered = false;

function registerListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  onSteamEvent(
    'steam:auth-state',
    (_event: unknown, data: { state: AuthState; error?: string }) => {
      authState.value = data.state;
      if (data.error) {
        error.value = data.error;
      }
      if (data.state === 'connected') {
        isConnected.value = true;
        error.value = null;
        restoringSession.value = false;
        // Don't reset switchingAccount here — wait for inventory-updated so the
        // overlay stays until the new user's inventory is actually loaded
      } else if (data.state === 'error') {
        isConnected.value = false;
        restoringSession.value = false;
        switchingAccount.value = false;
      } else if (data.state === 'disconnected') {
        isConnected.value = false;
        restoringSession.value = false;
        // Don't reset switchingAccount on disconnect — it's expected during a switch
      }
    },
  );

  onSteamEvent(
    'steam:steam-guard-required',
    (_event: unknown, data: { type: 'email' | 'mobile' }) => {
      steamGuardType.value = data.type;
      authState.value = 'waiting-for-steam-guard';
    },
  );

  onSteamEvent('steam:user-info', (_event: unknown, data: UserInfo) => {
    userInfo.value = data;
  });

  onSteamEvent('steam:error', (_event: unknown, data: { message: string }) => {
    error.value = data.message;
  });

  onSteamEvent('steam:saved-accounts-updated', (_event: unknown, data: SavedAccountMeta[]) => {
    savedAccounts.value = data;
  });

  onSteamEvent('steam:inventory-updated', () => {
    if (switchingAccount.value) {
      switchingAccount.value = false;
    }
  });
}

export function useSteam() {
  registerListeners();

  async function trySavedSession() {
    restoringSession.value = true;
    authState.value = 'connecting';
    const hasSession = await steamTrySavedSession();
    if (!hasSession) {
      restoringSession.value = false;
      authState.value = 'disconnected';
    }
  }

  async function credentialLogin(username: string, password: string) {
    authState.value = 'connecting';
    error.value = null;
    try {
      await steamCredentialLogin({ username, password });
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      authState.value = 'error';
    }
  }

  async function submitSteamGuard(code: string) {
    await steamSubmitSteamGuard(code);
  }

  async function logout() {
    await steamLogout();
    useInventoryStore().reset();
    isConnected.value = false;
    userInfo.value = null;
    authState.value = 'disconnected';
    error.value = null;
  }

  async function getSavedAccounts() {
    savedAccounts.value = await steamGetSavedAccounts();
  }

  async function switchAccount(steamId: string) {
    switchingAccount.value = true;
    error.value = null;
    useInventoryStore().reset();
    try {
      await steamSwitchAccount(steamId);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      switchingAccount.value = false;
    }
  }

  async function removeAccount(steamId: string) {
    await steamRemoveAccount(steamId);
  }

  return {
    authState: readonly(authState),
    userInfo: readonly(userInfo),
    error: readonly(error),
    steamGuardType: readonly(steamGuardType),
    isConnected: readonly(isConnected),
    restoringSession: readonly(restoringSession),
    savedAccounts: readonly(savedAccounts),
    switchingAccount: readonly(switchingAccount),
    trySavedSession,
    credentialLogin,
    submitSteamGuard,
    logout,
    getSavedAccounts,
    switchAccount,
    removeAccount,
  };
}
