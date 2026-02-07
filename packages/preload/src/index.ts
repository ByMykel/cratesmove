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
  onSteamEvent,
};
