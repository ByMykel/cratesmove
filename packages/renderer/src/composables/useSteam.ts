import {ref, readonly} from 'vue';
import {onSteamEvent, steamCredentialLogin, steamSubmitSteamGuard, steamLogout, steamTrySavedSession} from '@app/preload';
import type {AuthState, UserInfo} from '@/types/steam';

const authState = ref<AuthState>('disconnected');
const userInfo = ref<UserInfo | null>(null);
const error = ref<string | null>(null);
const steamGuardType = ref<'email' | 'mobile' | null>(null);
const isConnected = ref(false);
const restoringSession = ref(false);

let listenersRegistered = false;

function registerListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  onSteamEvent('steam:auth-state', (_event: unknown, data: {state: AuthState; error?: string}) => {
    authState.value = data.state;
    if (data.error) {
      error.value = data.error;
    }
    if (data.state === 'connected') {
      isConnected.value = true;
      error.value = null;
      restoringSession.value = false;
    } else if (data.state === 'disconnected' || data.state === 'error') {
      isConnected.value = false;
      restoringSession.value = false;
    }
  });

  onSteamEvent('steam:steam-guard-required', (_event: unknown, data: {type: 'email' | 'mobile'}) => {
    steamGuardType.value = data.type;
    authState.value = 'waiting-for-steam-guard';
  });

  onSteamEvent('steam:user-info', (_event: unknown, data: UserInfo) => {
    userInfo.value = data;
  });

  onSteamEvent('steam:error', (_event: unknown, data: {message: string}) => {
    error.value = data.message;
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
    await steamCredentialLogin({username, password});
  }

  async function submitSteamGuard(code: string) {
    await steamSubmitSteamGuard(code);
  }

  async function logout() {
    await steamLogout();
    isConnected.value = false;
    userInfo.value = null;
    authState.value = 'disconnected';
    error.value = null;
  }

  return {
    authState: readonly(authState),
    userInfo: readonly(userInfo),
    error: readonly(error),
    steamGuardType: readonly(steamGuardType),
    isConnected: readonly(isConnected),
    restoringSession: readonly(restoringSession),
    trySavedSession,
    credentialLogin,
    submitSteamGuard,
    logout,
  };
}
