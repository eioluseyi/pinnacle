import { app, BrowserWindow, ipcMain } from 'electron/main';
import os from 'node:os';

import { appLifecycleState, displayUrlState, pinnacleServers, scanningState } from '@/electron/src/appState';
import { scan } from '@/electron/src/helpers/discovery';
import { logError } from '@/electron/src/helpers/logger';

const broadcast = (channel: string, ...args: unknown[]) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, ...args);
    }
  });
};

export const initIpcHandlers = () => {
  ipcMain.handle('servers:get', () => pinnacleServers.value);
  ipcMain.handle('servers:get-state', () => ({ servers: pinnacleServers.value, isScanning: scanningState.value }));

  ipcMain.handle('servers:scan', async () => {
    const servers = await scan();
    broadcast('servers:changed', servers);
    return servers;
  });

  ipcMain.handle('app:get-lifecycle', () => appLifecycleState.value);

  ipcMain.handle('stream:set-url', (_event, url: string) => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      displayUrlState.setState(null);
      return;
    }

    const normalizedUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `http://${trimmedUrl}`;

    displayUrlState.setState(normalizedUrl);
  });

  ipcMain.handle('stream:disconnect', () => {
    displayUrlState.setState(null);
  });

  ipcMain.handle('stream:get-url', () => displayUrlState.value);

  pinnacleServers.subscribe((servers) => {
    broadcast('servers:changed', servers);
  });

  scanningState.subscribe((isScanning) => {
    broadcast('servers:scanning-changed', isScanning);
  });

  displayUrlState.subscribe((url) => {
    broadcast('stream:url-changed', url);
  });

  appLifecycleState.subscribe((status) => {
    broadcast('app:lifecycle-changed', status);
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getName', () => app.getName());
  ipcMain.handle('app:getVersionAndName', () => ({
    version: app.getVersion(),
    name: app.getName(),
  }));
  ipcMain.handle('app:getPlatform', () => process.platform);
  ipcMain.handle('app:getArch', () => process.arch);
  ipcMain.handle('app:getRuntimePath', () => process.execPath);
  ipcMain.handle('app:getUserDataPath', () => app.getPath('userData'));
  ipcMain.handle('app:getTempPath', () => app.getPath('temp'));
  ipcMain.handle('app:getHomePath', () => os.homedir());
  ipcMain.handle('app:getLocale', () => app.getLocale());
  ipcMain.handle('app:getLocaleCountryCode', () => app.getLocaleCountryCode());

  ipcMain.handle('app:logError', (_event, message: string, stack?: string) => {
    logError(message, stack);
    return true;
  });
};
