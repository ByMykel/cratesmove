import {sha256sum} from './nodeCrypto.js';
import {versions} from './versions.js';
import {ipcRenderer} from 'electron';

function send(channel: string, message: string) {
  return ipcRenderer.invoke(channel, message);
}

// Steam Auth
function steamCredentialLogin(creds: {username: string; password: string}) {
  return ipcRenderer.invoke('steam:credential-login', creds);
}

function steamSubmitSteamGuard(code: string) {
  return ipcRenderer.invoke('steam:submit-steam-guard', code);
}

function steamLogout() {
  return ipcRenderer.invoke('steam:logout');
}

function steamTrySavedSession(): Promise<boolean> {
  return ipcRenderer.invoke('steam:try-saved-session');
}

// Steam Inventory
function steamGetInventory() {
  return ipcRenderer.invoke('steam:get-inventory');
}

function steamGetStorageUnits() {
  return ipcRenderer.invoke('steam:get-storage-units');
}

function steamInspectStorage(id: string) {
  return ipcRenderer.invoke('steam:inspect-storage', id);
}

function steamDepositToStorage(args: {storageId: string; itemIds: string[]}) {
  return ipcRenderer.invoke('steam:deposit-to-storage', args);
}

function steamRetrieveFromStorage(args: {storageId: string; itemIds: string[]}) {
  return ipcRenderer.invoke('steam:retrieve-from-storage', args);
}

function steamRenameStorage(args: {storageId: string; name: string}) {
  return ipcRenderer.invoke('steam:rename-storage', args);
}

// App / Updates
function getAppVersion(): Promise<string> {
  return ipcRenderer.invoke('app:get-version');
}

function checkForUpdates() {
  return ipcRenderer.invoke('app:check-for-updates');
}

function installUpdate() {
  return ipcRenderer.invoke('app:install-update');
}

// Multi-account
function steamGetSavedAccounts() {
  return ipcRenderer.invoke('steam:get-saved-accounts');
}

function steamSwitchAccount(steamId: string) {
  return ipcRenderer.invoke('steam:switch-account', steamId);
}

function steamRemoveAccount(steamId: string) {
  return ipcRenderer.invoke('steam:remove-account', steamId);
}

// Steam Event Listener
function onSteamEvent(channel: string, callback: (...args: any[]) => void) {
  ipcRenderer.on(channel, callback);
  return () => {
    ipcRenderer.removeListener(channel, callback);
  };
}

export {
  sha256sum,
  versions,
  send,
  steamCredentialLogin,
  steamSubmitSteamGuard,
  steamLogout,
  steamTrySavedSession,
  steamGetInventory,
  steamGetStorageUnits,
  steamInspectStorage,
  steamDepositToStorage,
  steamRetrieveFromStorage,
  steamRenameStorage,
  steamGetSavedAccounts,
  steamSwitchAccount,
  steamRemoveAccount,
  onSteamEvent,
  getAppVersion,
  checkForUpdates,
  installUpdate,
};
