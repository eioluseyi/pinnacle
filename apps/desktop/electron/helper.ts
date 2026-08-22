import { app, BrowserWindow, powerMonitor } from 'electron/main';
import net from 'node:net';
import path from 'node:path';
import { updateElectronApp } from 'update-electron-app';

import { NextServer, SocketServer, startNextServer, startSocketServer } from '@pinnacle/server';
import { createLogger, getLocalIpAddress } from '@pinnacle/utils';

import { delay, getErrorMessage } from './utils';
import { initSentry } from './sentry';
import { Ports } from '@pinnacle/shared-types';

const __dirname = path.dirname(__filename);
const preload = path.join(__dirname, 'preload.js');

export const DEFAULT_PORTS = {
  next: 3000,
  socket: 1234,
};

export const ports = {
  ...DEFAULT_PORTS,
};

type Listener = (ports: Ports) => void;
const portListeners = new Set<Listener>();

function notifyPortListeners() {
  const snapshot = { ...ports };
  portListeners.forEach((listener) => listener(snapshot));
}

export function onPortsChange(listener: Listener) {
  portListeners.add(listener);

  return () => {
    portListeners.delete(listener);
  };
}

export function setPorts(newPorts: Ports) {
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

let nextServer: NextServer;
let socketServer: SocketServer;

export function logError(context: string, error?: unknown, extra = {}) {
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

export function isPortAvailable(port: number) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

export async function findAvailablePort(startPort: number, maxAttempts = 20) {
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
  return { ...ports };
}

export async function waitForServer(port: number, { maxAttempts = 30, retryDelayMs = 250 } = {}) {
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
  let pollingTimer: NodeJS.Timeout | null;

  const startPollingIP = () => {
    if (pollingTimer) return;

    pollingTimer = setInterval(() => {
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
  };

  const stopPollingIP = () => {
    if (!pollingTimer) return;
    clearInterval(pollingTimer);
    pollingTimer = null;
  };

  // 1. Start polling when the app boots
  startPollingIP();

  // 2. Pause when the computer goes to sleep
  powerMonitor.on('suspend', () => {
    stopPollingIP();
  });

  // 3. Resume when the computer wakes up
  powerMonitor.on('resume', () => {
    startPollingIP();
  });
}

export function initUpdater() {
  try {
    updateElectronApp();
  } catch (error) {
    logError('Auto-update setup failed', error);
  }
}

async function createWindow({ nextPort }: { nextPort: number }) {
  let win;

  try {
    win = new BrowserWindow({
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
      },
      width: 1200,
      height: 800,
      minWidth: 960,
      minHeight: 700,
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

export const getIsDev = () => !app.isPackaged;

export async function startApp() {
  try {
    const isDev = getIsDev();

    if (!isDev) {
      nextServer = startNextServer({ port: ports.next });
      socketServer = startSocketServer({ port: ports.socket });
    }

    await createWindow({ nextPort: ports.next });

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
