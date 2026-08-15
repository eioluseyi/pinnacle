import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow } from 'electron/main';
import { startNextServer } from '../server/next-server.js';
import { startSocketServer } from '../server/socket-server.js';
import { getLocalIpAddress } from './utils.js';
import { ipcMain } from 'electron/main';
import { updateElectronApp } from 'update-electron-app';
import squirrelStartup from 'electron-squirrel-startup';
import { initSentry } from './sentry.js';
import { createLogger } from '../lib/logger-core.js';

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

let logger;

try {
  initSentry();
  logger = createLogger('main', {
    minLevel: process.env.LOG_LEVEL ?? (app.isPackaged ? 'info' : 'debug'),
  });
} catch (error) {
  console.error('Sentry initialization failed:', error);
  logger = createLogger('main', {
    minLevel: process.env.LOG_LEVEL ?? (app.isPackaged ? 'info' : 'debug'),
  });
}

function logError(context, error, extra = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  if (logger) {
    logger.error(context, err, extra);
  } else {
    console.error(`[${context}]`, err, extra);
  }
}

process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error);
});

process.on('unhandledRejection', (reason) => {
  logError('Unhandled rejection', reason);
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (squirrelStartup) {
  app.quit();
}

try {
  // Automatically checks GitHub Releases for updates every 10 minutes
  updateElectronApp();
} catch (error) {
  logError('Auto-update setup failed', error);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const preload = path.join(__dirname, 'preload.js');

let nextServer;
let socketServer;

const NEXT_PORT = 3000;
const SOCKET_PORT = 1234;

ipcMain.handle('get-local-ip', () => {
  try {
    const ip = getLocalIpAddress();
    const port = { socket: SOCKET_PORT, next: NEXT_PORT };

    return { ip, port };
  } catch (error) {
    logError('Failed to resolve local IP', error);
    return { ip: '127.0.0.1', port: { socket: SOCKET_PORT, next: NEXT_PORT } };
  }
});

let currentIp = getLocalIpAddress();
setInterval(() => {
  try {
    const nextIp = getLocalIpAddress();

    if (nextIp !== currentIp) {
      currentIp = nextIp;
      logger.info('Local IP address changed', { ip: nextIp });

      BrowserWindow.getAllWindows().forEach((win) => {
        try {
          // Todo: Implement dynamic port handling
          win.webContents.send('network:ip-changed', nextIp, { socket: SOCKET_PORT, next: NEXT_PORT });
        } catch (error) {
          logError('Failed to notify renderer about IP change', error, { nextIp });
        }
      });
    }
  } catch (error) {
    logError('IP polling failed', error);
  }
}, 2000);

async function createWindow() {
  let win;

  try {
    win = new BrowserWindow({
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
      },
      width: 960,
      height: 700,
    });

    await waitForServer(NEXT_PORT);
    await win.loadURL(`http://localhost:${NEXT_PORT}/splash-screen`);

    return win;
  } catch (error) {
    if (win) {
      try {
        win.destroy();
      } catch (destroyError) {
        logError('Failed to destroy failed window', destroyError, { originalError: getErrorMessage(error) });
      }
    }

    throw new Error(`Failed to create main window: ${getErrorMessage(error)}`);
  }
}

async function waitForServer(port, maxAttempts = 30, retryDelayMs = 250) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(`http://localhost:${port}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return;
    } catch (error) {
      attempt += 1;
      logger.warn(`Waiting for server on port ${port} (attempt ${attempt}/${maxAttempts})`, error);

      if (attempt >= maxAttempts) {
        throw new Error(`Server on port ${port} did not become ready after ${maxAttempts} attempts`);
      }

      await delay(retryDelayMs);
    }
  }
}

async function startApp() {
  try {
    logger.info('Application ready');

    nextServer = await startNextServer({ port: NEXT_PORT });
    socketServer = await startSocketServer({ port: SOCKET_PORT });

    await createWindow();
    logger.info('Main window created');

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow().catch((error) => {
          logError('Window activation failed', error);
        });
      }
    });
  } catch (error) {
    logError('Application startup failed', error);
    throw error;
  }
}

app
  .whenReady()
  .then(startApp)
  .catch((error) => {
    logError('app.whenReady failed', error);
  });

app.on('window-all-closed', () => {
  try {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  } catch (error) {
    logError('window-all-closed handler failed', error);
  }
});

app.on('before-quit', () => {
  try {
    nextServer?.close();
    socketServer?.close();
  } catch (error) {
    logError('before-quit cleanup failed', error);
  }
});
