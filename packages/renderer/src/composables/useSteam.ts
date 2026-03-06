import { ref, readonly } from 'vue';
import {
  onSteamEvent,
  steamCredentialLogin,
  steamSubmitSteamGuard,
  steamLogout,
  steamGetSavedAccounts,
  steamSwitchAccount,
  steamRemoveAccount,
} from '@app/preload';
import type { AuthState, UserInfo, SavedAccountMeta } from '@/types/steam';
import { useInventoryStore } from '@/composables/useInventoryStore';

const ERROR_MESSAGES: Record<string, string> = {
  InvalidPassword: 'Incorrect password. Please try again.',
  InvalidLoginAuthCode: 'Invalid Steam Guard code. Please try again.',
  TwoFactorCodeMismatch: 'Invalid authenticator code. Please try again.',
  RateLimitExceeded: 'Too many attempts. Please wait and try again.',
  AccountDisabled: 'This account has been disabled.',
  AccountLoginDeniedNeedTwoFactor: 'Steam Guard authentication required.',
  Timeout: 'Connection timed out. Please try again.',
};

export function friendlyError(raw: string | null): string {
  if (!raw) return '';
  return ERROR_MESSAGES[raw] ?? raw;
}

const authState = ref<AuthState>('disconnected');
const userInfo = ref<UserInfo | null>(null);
const error = ref<string | null>(null);
const steamGuardType = ref<'email' | 'mobile' | null>(null);
const isConnected = ref(false);
const savedAccounts = ref<SavedAccountMeta[]>([]);
const switchingAccount = ref(false);

let listenersRegistered = false;
let connectedDuringSwitch = false;

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

        // Mark that the new account has connected — the next inventory-updated
        // event is from the new account and can safely clear switchingAccount
        if (switchingAccount.value) {
          connectedDuringSwitch = true;
        }
      } else if (data.state === 'error') {
        isConnected.value = false;

        switchingAccount.value = false;
        connectedDuringSwitch = false;
      } else if (data.state === 'disconnected') {
        isConnected.value = false;

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
    if (switchingAccount.value) {
      switchingAccount.value = false;
      connectedDuringSwitch = false;
    }
  });

  onSteamEvent('steam:saved-accounts-updated', (_event: unknown, data: SavedAccountMeta[]) => {
    savedAccounts.value = data;
  });

  onSteamEvent('steam:inventory-updated', () => {
    if (switchingAccount.value && connectedDuringSwitch) {
      switchingAccount.value = false;
      connectedDuringSwitch = false;
    }
  });
}

export function useSteam() {
  registerListeners();

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
    connectedDuringSwitch = false;
    error.value = null;
    useInventoryStore().reset();
    try {
      await steamSwitchAccount(steamId);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      switchingAccount.value = false;
      connectedDuringSwitch = false;
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
    savedAccounts: readonly(savedAccounts),
    switchingAccount: readonly(switchingAccount),
    credentialLogin,
    submitSteamGuard,
    logout,
    getSavedAccounts,
    switchAccount,
    removeAccount,
  };
}
