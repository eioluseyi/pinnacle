import { app, BrowserWindow } from 'electron/main';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../lib/logger-core.js';
import { getErrorMessage, getLocalIpAddress } from './utils.js';
import { startNextServer } from '../server/next-server.js';
import { startSocketServer } from '../server/socket-server.js';
import { initSentry } from './sentry.js';
import { updateElectronApp } from 'update-electron-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const preload = path.join(__dirname, 'preload.js');
const logger = createAppLogger();

let nextServer;
let socketServer;

const NEXT_PORT = 3000;
const SOCKET_PORT = 1234;

export function logError(context, error, extra = {}) {
  const err = error instanceof Error ? error : new Error(String(error));

  if (logger) {
    logger.error(context, err, extra);
    return;
  }

  console.error(`[${context}]`, err, extra);
}

export function bindProcessGuards() {
  try {
    process.on('uncaughtException', (error) => {
      logError('Uncaught exception', error);
    });

    process.on('unhandledRejection', (reason) => {
      logError('Unhandled rejection', reason);
    });
  } catch (err) {
    logError('Process guard setup failure', err);
  }
}

export async function waitForServer(port, { maxAttempts = 30, retryDelayMs = 250 } = {}) {
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
      logError(`Waiting for server on port ${port}`, error, { attempt, maxAttempts });

      if (attempt >= maxAttempts) {
        throw new Error(`Server on port ${port} did not become ready after ${maxAttempts} attempts`);
      }

      await delay(retryDelayMs);
    }
  }
}

export function initErrorListeners() {
  try {
    initSentry();
    bindProcessGuards();
  } catch (error) {
    console.error('Sentry initialization failed:', error);
    bindProcessGuards();
  }
}

export function initIpListener() {
  let currentIp = getLocalIpAddress();
  setInterval(() => {
    try {
      const nextIp = getLocalIpAddress();

      if (nextIp !== currentIp) {
        currentIp = nextIp;
        logger.info('Local IP address changed', { ip: nextIp });

        BrowserWindow.getAllWindows().forEach((win) => {
          try {
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
}

export function initUpdater() {
  try {
    // Automatically checks GitHub Releases for updates every 10 minutes
    updateElectronApp();
  } catch (error) {
    logError('Auto-update setup failed', error);
  }
}

async function createWindow({ nextPort }) {
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

    await waitForServer(nextPort);
    await win.loadURL(`http://localhost:${nextPort}/splash-screen`);

    return win;
  } catch (error) {
    if (win) {
      try {
        win.destroy();
      } catch (destroyError) {
        logError('Failed to destroy failed window', destroyError, {
          originalError: getErrorMessage(error),
        });
      }
    }

    throw new Error(`Failed to create main window: ${getErrorMessage(error)}`);
  }
}

export function shutdownServices() {
  try {
    nextServer?.close();
    socketServer?.close();
  } catch (error) {
    logError('Shutdown cleanup failed', error);
  }
}

export async function startApp() {
  try {
    logger.info('Application ready');

    nextServer = await startNextServer({ port: NEXT_PORT });
    socketServer = await startSocketServer({ port: SOCKET_PORT });

    await createWindow({ nextPort: NEXT_PORT });
    logger.info('Main window created');

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow({ nextPort: NEXT_PORT }).catch((error) => {
          logError('Window activation failed', error);
        });
      }
    });
  } catch (error) {
    logError('Application startup failed', error);
    throw error;
  }
}

export function createAppLogger() {
  return createLogger('main', {
    minLevel: process.env.LOG_LEVEL ?? (app.isPackaged ? 'info' : 'debug'),
  });
}
