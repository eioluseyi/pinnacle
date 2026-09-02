import { app } from 'electron/main';
import squirrelStartup from 'electron-squirrel-startup';
import { initErrorListeners, startApp } from '@/electron/src/helpers/initialization';
import { initUpdater } from '@/electron/src/helpers/updater';
import { initIpcHandlers } from '@/electron/src/ipcHandlers';
import { initIpListener } from '@/electron/src/helpers/network';
import { logError } from '@/electron/src/helpers/logger';
import { shutdownServices } from '@/electron/src/helpers/server';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (squirrelStartup) app.quit();

initErrorListeners();
initUpdater();
initIpcHandlers();
initIpListener();

app
  .whenReady()
  .then(startApp)
  .catch((error) => {
    logError('app.whenReady failed', error);
  });

app.on('window-all-closed', () => {
  try {
    if (process.platform !== 'darwin') app.quit();
  } catch (error) {
    logError('window-all-closed handler failed', error);
  }
});

app.on('before-quit', shutdownServices);
