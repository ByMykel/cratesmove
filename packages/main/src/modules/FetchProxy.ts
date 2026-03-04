import type { AppModule } from '../AppModule.js';
import { ipcMain, net } from 'electron';

const ALLOWED_URLS = new Set(['https://csfloat.com/api/v1/listings/price-list']);

export function fetchProxy(): AppModule {
  return {
    enable() {
      ipcMain.handle('app:fetch-url', async (_e, url: string) => {
        if (!ALLOWED_URLS.has(url)) {
          throw new Error(`Fetch not allowed for URL: ${url}`);
        }
        const res = await net.fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return res.text();
      });
    },
  };
}
