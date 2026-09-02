import { BrowserWindow } from 'electron/main';
import net from 'node:net';
import path from 'node:path';

import { logError } from './logger';
import { delay, getErrorMessage } from '@/electron/utils';

const __dirname = path.dirname(__filename);
const preload = path.join(__dirname, 'preload.js');

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

export async function resolveAvailablePorts(DEFAULT_PORTS: { next: number; socket: number }, setPorts: any) {
  const nextPort = await findAvailablePort(DEFAULT_PORTS.next);
  const socketPort = await findAvailablePort(DEFAULT_PORTS.socket);

  setPorts({ next: nextPort, socket: socketPort });
  return { next: nextPort, socket: socketPort };
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

export async function createWindow({ nextPort }: { nextPort: number }) {
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
  } catch (error) {
    logError('Shutdown cleanup failed', error);
  }
}
