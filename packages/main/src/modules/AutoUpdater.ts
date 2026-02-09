import { AppModule } from '../AppModule.js';
import { ipcMain, app } from 'electron';
import electronUpdater, { type AppUpdater, type Logger } from 'electron-updater';
import { broadcastToRenderers } from '../broadcastToRenderers.js';

export class AutoUpdater implements AppModule {
  readonly #logger: Logger | null;

  constructor({ logger = null }: { logger?: Logger | null | undefined } = {}) {
    this.#logger = logger;
  }

  enable(): void {
    this.#registerIpcHandlers();
    this.#registerUpdaterEvents();
    this.#checkOnStartup();
  }

  #getAutoUpdater(): AppUpdater {
    // Using destructuring to access autoUpdater due to the CommonJS module of 'electron-updater'.
    // It is a workaround for ESM compatibility issues, see https://github.com/electron-userland/electron-builder/issues/7976.
    const { autoUpdater } = electronUpdater;
    return autoUpdater;
  }

  #registerIpcHandlers() {
    ipcMain.handle('app:get-version', () => app.getVersion());

    ipcMain.handle('app:check-for-updates', async () => {
      try {
        await this.#getAutoUpdater().checkForUpdates();
      } catch (error) {
        if (error instanceof Error && error.message.includes('No published versions')) {
          return null;
        }
        throw error;
      }
    });

    ipcMain.handle('app:install-update', () => {
      this.#getAutoUpdater().quitAndInstall();
    });
  }

  #registerUpdaterEvents() {
    const updater = this.#getAutoUpdater();
    updater.logger = this.#logger || null;
    updater.fullChangelog = true;
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;

    if (import.meta.env.VITE_DISTRIBUTION_CHANNEL) {
      updater.channel = import.meta.env.VITE_DISTRIBUTION_CHANNEL;
    }

    updater.on('update-available', info => {
      broadcastToRenderers('app:update-available', { version: info.version });
    });

    updater.on('update-not-available', () => {
      broadcastToRenderers('app:update-not-available', {});
    });

    updater.on('download-progress', progress => {
      broadcastToRenderers('app:update-progress', { percent: progress.percent });
    });

    updater.on('update-downloaded', info => {
      broadcastToRenderers('app:update-downloaded', { version: info.version });
    });

    updater.on('error', error => {
      broadcastToRenderers('app:update-error', { message: error.message });
    });
  }

  async #checkOnStartup() {
    try {
      await this.#getAutoUpdater().checkForUpdates();
    } catch (error) {
      if (error instanceof Error && !error.message.includes('No published versions')) {
        broadcastToRenderers('app:update-error', { message: error.message });
      }
    }
  }
}

export function autoUpdater(...args: ConstructorParameters<typeof AutoUpdater>) {
  return new AutoUpdater(...args);
}
