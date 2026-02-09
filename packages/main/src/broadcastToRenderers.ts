import { BrowserWindow } from 'electron';

export function broadcastToRenderers(channel: string, data: unknown) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data);
    }
  }
}
