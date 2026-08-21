import { app } from 'electron/main';
import squirrelStartup from 'electron-squirrel-startup';
import { initErrorListeners, initIpListener, initUpdater, logError, shutdownServices, startApp } from './helper';
import { initIpcHandlers } from './ipcHandlers';

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
