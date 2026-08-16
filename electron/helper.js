import { app, BrowserWindow } from 'electron/main';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../lib/logger-core.js';
import { delay, getErrorMessage, getLocalIpAddress } from './utils.js';
import { startNextServer } from '../server/next-server.js';
import { startSocketServer } from '../server/socket-server.js';
import { initSentry } from './sentry.js';
import { updateElectronApp } from 'update-electron-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const preload = path.join(__dirname, 'preload.js');

export const DEFAULT_PORTS = {
  next: 3000,
  socket: 1234,
};

export const ports = {
  ...DEFAULT_PORTS,
};

const portListeners = new Set();

function notifyPortListeners() {
  const snapshot = { ...ports };
  portListeners.forEach((listener) => listener(snapshot));
}

export function onPortsChange(listener) {
  portListeners.add(listener);

  return () => {
    portListeners.delete(listener);
  };
}

export function setPorts(newPorts) {
  ports.next = newPorts.next;
  ports.socket = newPorts.socket;
  notifyPortListeners();
}

export function createAppLogger() {
  return createLogger('main', {
    minLevel: process.env.LOG_LEVEL ?? (app.isPackaged ? 'info' : 'debug'),
  });
}

const logger = createAppLogger();

let nextServer;
let socketServer;

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

export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

export async function findAvailablePort(startPort, maxAttempts = 20) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No free port found starting from ${startPort}`);
}

export async function resolveAvailablePorts() {
  const nextPort = await findAvailablePort(DEFAULT_PORTS.next);
  const socketPort = await findAvailablePort(DEFAULT_PORTS.socket);

  setPorts({ next: nextPort, socket: socketPort });
  logger.info('Resolved app ports', ports);

  return { ...ports };
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
      logError('Waiting for server', error, { port, attempt, maxAttempts });

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
  let currentPorts = { ...ports };

  setInterval(() => {
    try {
      const nextIp = getLocalIpAddress();
      const ipChanged = nextIp !== currentIp;
      const portsChanged = currentPorts.next !== ports.next || currentPorts.socket !== ports.socket;

      if (nextIp !== currentIp) {
        currentIp = nextIp;
        logger.info('Local IP address changed', { ip: nextIp });
      }

      if (portsChanged) {
        currentPorts = { ...ports };
        logger.info('Local ports changed', { ports });
      }

      if (!ipChanged && !portsChanged) return;

      BrowserWindow.getAllWindows().forEach((win) => {
        try {
          win.webContents.send('network:ip-changed', nextIp, ports);
        } catch (error) {
          logError('Failed to notify renderer about IP change', error, { nextIp, ports });
        }
      });
    } catch (error) {
      logError('IP polling failed', error);
    }
  }, 2000);
}

export function initUpdater() {
  try {
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
    const resolvedPorts = await resolveAvailablePorts();
    logger.info('Application ready', resolvedPorts);

    nextServer = await startNextServer({ port: ports.next });
    socketServer = await startSocketServer({ port: ports.socket });

    await createWindow({ nextPort: ports.next });
    logger.info('Main window created', { ports: { ...ports } });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow({ nextPort: ports.next }).catch((error) => {
          logError('Window activation failed', error);
        });
      }
    });
  } catch (error) {
    logError('Application startup failed', error);
    throw error;
  }
}
