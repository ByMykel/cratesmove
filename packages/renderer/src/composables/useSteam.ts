import { ref, readonly } from 'vue';
import {
  onSteamEvent,
  steamCredentialLogin,
  steamWebtokenLogin,
  steamSubmitSteamGuard,
  steamLogout,
  steamGetSavedAccounts,
  steamSwitchAccount,
  steamRemoveAccount,
} from '@app/preload';
import type { AuthState, UserInfo, SavedAccountMeta, GcStatus } from '@/types/steam';
import { useInventoryStore } from '@/composables/useInventoryStore';

const ERROR_MESSAGES: Record<string, string> = {
  Expired: 'Your saved session has expired. Please sign in again.',
  Revoked: 'Your saved session is no longer valid. Please sign in again.',
  InvalidPassword: 'Incorrect password. Please try again.',
  InvalidLoginAuthCode: 'Invalid Steam Guard code. Please try again.',
  TwoFactorCodeMismatch: 'Invalid authenticator code. Please try again.',
  AccountLoginDeniedNeedTwoFactor: 'Steam Guard authentication required.',
  AccountLogonDenied: 'Steam Guard code required. Check your email.',
  ExpiredLoginAuthCode: 'Steam Guard code expired. Please request a new one.',
  RateLimitExceeded: 'Too many attempts. Please wait and try again.',
  AccountDisabled: 'This account has been disabled.',
  AccountLocked: 'This account is locked. Contact Steam Support to unlock it.',
  AccountLockedDown: 'This account is locked. Contact Steam Support to unlock it.',
  Banned: 'This account is banned from this service.',
  LoggedInElsewhere: 'This account was signed in from another location.',
  LogonSessionReplaced: 'This account was signed in from another location.',
  NoConnection: "Couldn't reach Steam. Check your internet connection.",
  ServiceUnavailable: 'Steam is temporarily unavailable. Please try again later.',
  TryAnotherCM: 'Steam servers are busy. Please try again in a moment.',
  Busy: 'Steam servers are busy. Please try again in a moment.',
  Timeout: 'Connection timed out. Please try again.',
};

export function friendlyError(raw: string | null, code?: number): string {
  if (!raw) return '';
  if (ERROR_MESSAGES[raw]) return ERROR_MESSAGES[raw];
  if (code !== undefined || /^[A-Z][A-Za-z0-9]*$/.test(raw)) {
    return `Steam couldn't complete the request (${raw}${code !== undefined ? `, code ${code}` : ''}). Please try again.`;
  }
  return raw;
}

const authState = ref<AuthState>('disconnected');
const userInfo = ref<UserInfo | null>(null);
const error = ref<string | null>(null);
const steamGuardType = ref<'email' | 'mobile' | null>(null);
const isConnected = ref(false);
const savedAccounts = ref<SavedAccountMeta[]>([]);
const switchingAccount = ref(false);
const gcStatus = ref<GcStatus>('connecting');

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
        switchingAccount.value = false;
      } else if (data.state === 'error') {
        isConnected.value = false;

        switchingAccount.value = false;
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

  onSteamEvent('steam:gc-status', (_event: unknown, status: GcStatus) => {
    gcStatus.value = status;
  });

  onSteamEvent('steam:user-info', (_event: unknown, data: UserInfo) => {
    userInfo.value = data;
  });

  onSteamEvent('steam:error', (_event: unknown, data: { message: string }) => {
    error.value = data.message;
    if (switchingAccount.value) {
      switchingAccount.value = false;
    }
  });

  onSteamEvent('steam:saved-accounts-updated', (_event: unknown, data: SavedAccountMeta[]) => {
    savedAccounts.value = data;
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

  async function webtokenLogin(tokenJson: string) {
    authState.value = 'connecting';
    error.value = null;
    try {
      await steamWebtokenLogin({ tokenJson });
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
    gcStatus.value = 'connecting';
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
    savedAccounts: readonly(savedAccounts),
    switchingAccount: readonly(switchingAccount),
    gcStatus: readonly(gcStatus),
    credentialLogin,
    webtokenLogin,
    submitSteamGuard,
    logout,
    getSavedAccounts,
    switchAccount,
    removeAccount,
  };
}
