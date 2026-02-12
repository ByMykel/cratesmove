import type { AppModule } from '../AppModule.js';
import { ModuleContext } from '../ModuleContext.js';
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import type { AppInitConfig } from '../AppInitConfig.js';
import { join } from 'node:path';

class WindowManager implements AppModule {
  readonly #preload: { path: string };
  readonly #renderer: { path: string } | URL;
  readonly #openDevTools;

  constructor({
    initConfig,
    openDevTools = false,
  }: {
    initConfig: AppInitConfig;
    openDevTools?: boolean;
  }) {
    this.#preload = initConfig.preload;
    this.#renderer = initConfig.renderer;
    this.#openDevTools = openDevTools;
  }

  async enable({ app }: ModuleContext): Promise<void> {
    await app.whenReady();

    Menu.setApplicationMenu(null);

    ipcMain.handle('window:minimize', () => {
      BrowserWindow.getFocusedWindow()?.minimize();
    });

    ipcMain.handle('window:maximize', () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win?.isMaximized()) {
        win.unmaximize();
      } else {
        win?.maximize();
      }
    });

    ipcMain.handle('window:close', () => {
      BrowserWindow.getFocusedWindow()?.close();
    });

    await this.restoreOrCreateWindow(true);
    app.on('second-instance', () => this.restoreOrCreateWindow(true));
    app.on('activate', () => this.restoreOrCreateWindow(true));
  }

  async createWindow(): Promise<BrowserWindow> {
    const browserWindow = new BrowserWindow({
      show: false, // Use the 'ready-to-show' event to show the instantiated BrowserWindow.
      frame: false,
      icon: join(app.getAppPath(), 'buildResources', 'icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Sandbox disabled because preload needs Node.js crypto and fs access
        webviewTag: false, // The webview tag is not recommended. Consider alternatives like an iframe or Electron's BrowserView. @see https://www.electronjs.org/docs/latest/api/webview-tag#warning
        preload: this.#preload.path,
      },
    });

    if (this.#renderer instanceof URL) {
      await browserWindow.loadURL(this.#renderer.href);
    } else {
      await browserWindow.loadFile(this.#renderer.path);
    }

    return browserWindow;
  }

  async restoreOrCreateWindow(show = false) {
    let window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());

    if (window === undefined) {
      window = await this.createWindow();
    }

    if (!show) {
      return window;
    }

    if (window.isMinimized()) {
      window.restore();
    }

    window?.show();

    if (this.#openDevTools) {
      window?.webContents.openDevTools();
    }

    window.focus();

    return window;
  }
}

export function createWindowManagerModule(...args: ConstructorParameters<typeof WindowManager>) {
  return new WindowManager(...args);
}
