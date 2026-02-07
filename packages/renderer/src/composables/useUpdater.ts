import {ref, readonly} from 'vue';
import {
  getAppVersion,
  checkForUpdates as ipcCheckForUpdates,
  installUpdate as ipcInstallUpdate,
  onSteamEvent,
} from '@app/preload';

const appVersion = ref('');
const updateAvailable = ref(false);
const updateDownloaded = ref(false);
const updateVersion = ref('');
const downloadProgress = ref(0);

let listenersRegistered = false;

function registerListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  getAppVersion().then(version => {
    appVersion.value = version;
  });

  onSteamEvent('app:update-available', (_event: unknown, data: {version: string}) => {
    updateAvailable.value = true;
    updateVersion.value = data.version;
  });

  onSteamEvent('app:update-not-available', () => {
    updateAvailable.value = false;
  });

  onSteamEvent('app:update-progress', (_event: unknown, data: {percent: number}) => {
    downloadProgress.value = Math.round(data.percent);
  });

  onSteamEvent('app:update-downloaded', (_event: unknown, data: {version: string}) => {
    updateDownloaded.value = true;
    updateVersion.value = data.version;
    downloadProgress.value = 100;
  });

  onSteamEvent('app:update-error', () => {
    // Reset downloading state on error so UI doesn't stay stuck
    if (!updateDownloaded.value) {
      downloadProgress.value = 0;
    }
  });
}

export function useUpdater() {
  registerListeners();

  return {
    appVersion: readonly(appVersion),
    updateAvailable: readonly(updateAvailable),
    updateDownloaded: readonly(updateDownloaded),
    updateVersion: readonly(updateVersion),
    downloadProgress: readonly(downloadProgress),
    checkForUpdates: ipcCheckForUpdates,
    installUpdate: ipcInstallUpdate,
  };
}
