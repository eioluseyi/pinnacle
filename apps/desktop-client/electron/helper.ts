import { app, BrowserWindow, powerMonitor } from 'electron/main';
import net from 'node:net';
import path from 'node:path';
import { updateElectronApp } from 'update-electron-app';
import { createLogger, getLocalIpAddress } from '@pinnacle/utils';

import { delay, getErrorMessage } from './utils';
import { initSentry } from './sentry';
import { Ports } from '@pinnacle/shared-types';
import child_process from 'node:child_process';
import util from 'node:util';
import { cacheNetworkIPs, networkIPs, pinnacleServers } from '@/electron/appState';
import os from 'os';

const __dirname = path.dirname(__filename);
const preload = path.join(__dirname, 'preload.js');
const exec = util.promisify(child_process.exec);

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

function getActiveBroadcastAddress() {
  const interfaces = os.networkInterfaces();

  for (const interfaceName in interfaces) {
    const networkCards = interfaces[interfaceName];
    if (!networkCards) continue;

    for (const card of networkCards) {
      if (!card) continue;
      // Only look for active, external IPv4 addresses
      if (card.family === 'IPv4' && !card.internal) {
        // If operating system provides the broadcast address natively (like macOS/Linux)
        if ((card as { broadcast?: string }).broadcast) {
          return (card as { broadcast?: string }).broadcast;
        }

        // Fallback bitwise math for Windows
        const ipParts = card.address.split('.').map(Number);
        const maskParts = card.netmask.split('.').map(Number);

        const broadcast = ipParts
          .map((byte, i) => {
            return byte | (~maskParts[i] & 255);
          })
          .join('.');

        return broadcast;
      }
    }
  }
  return null; // No active network connection found
}

/**
 * Pings the target broadcast address asynchronously using promises.
 * @param {string} broadcastAddress
 */
async function pingBroadcast(broadcastAddress?: string | null) {
  const isWindows = os.platform() === 'win32';
  const flag = isWindows ? '-n' : '-c';
  const command = `ping ${flag} 3 ${broadcastAddress}`;

  try {
    // Await the promise resolution
    const { stdout, stderr } = await exec(command);

    // Check for system warnings or non-fatal stderr output
    if (stderr) logError(`Ping system stderr: ${stderr}`);

    // Successfully captured the ping response
    return stdout;
  } catch (err) {
    const error = err as Error & { stdout?: string };
    // Promisified exec throws an error if the command exit code is non-zero
    logError(`Ping execution error: ${error.message}`);

    // If the ping failed but still generated output, it is attached to the error object
    if (error.stdout) {
      logError(`Partial Ping Output on Failure:\n${error.stdout}`);
    }

    throw err;
  }
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
  } catch (error) {
    logError('Shutdown cleanup failed', error);
  }
}

export const getIsDev = () => !app.isPackaged;

const probePinnacleServer = async (host: string, port: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 200);

  try {
    const response = await fetch(`http://${host}:${port}/`, {
      signal: controller.signal,
    });
    if (response.ok) return true;
  } catch {
    // Ignore network errors while scanning.
  } finally {
    clearTimeout(timeout);
  }

  return false;
};

const getIPsInNetwork = async () => {
  setTimeout(async () => {
    cacheNetworkIPs.setState(false); // Clear the state after 60 seconds to force a refresh
  }, 60_000); // Refresh every 60 seconds

  if (cacheNetworkIPs.value) return networkIPs.value;
  cacheNetworkIPs.setState(true); // Set the cache flag to true to prevent multiple scans

  const broadcastAddress = getActiveBroadcastAddress();
  if (!broadcastAddress)
    logger.warn('Could not determine broadcast address. Ensure the device is connected to a network.');

  await pingBroadcast(broadcastAddress).catch((error) => {
    logger.error('Error occurred while pinging broadcast address:', error);
  });

  const { stdout, stderr } = await exec('arp -a');
  if (stderr) {
    logError(`stderr: ${stderr}`);
    return [];
  }

  // Process the output to extract IP addresses
  const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
  const ips = stdout.match(ipRegex) || [];
  const ipsInNetwork = ips.map((ip) => ip.toString());
  networkIPs.setState(ipsInNetwork);

  return ipsInNetwork;
};

const getPinnacleServers = async () => {
  const localIp = getLocalIpAddress() || '';
  const ipsInNetwork = await getIPsInNetwork();
  const hosts = new Set([localIp, ...ipsInNetwork]);
  let _pinnacleServers = [];

  for (const host of hosts) {
    for (const port of [3000, 3001, 3002, 3003, 3004, 3005]) {
      if (await probePinnacleServer(host, port)) {
        _pinnacleServers.push({ host, port });

        const previousPinnacleServers = pinnacleServers.value || [];
        if (
          !previousPinnacleServers.some(
            (server: { host: string; port: number }) => server.host === host && server.port === port,
          )
        ) {
          pinnacleServers.setState([...previousPinnacleServers, { host, port }]);
        }
      } else {
        const previousPinnacleServers = pinnacleServers.value || [];
        const updatedPinnacleServers = previousPinnacleServers.filter(
          // Remove the server if it matches the current host and port
          (server: { host: string; port: number }) => !(server.host === host && server.port === port),
        );
        if (JSON.stringify(previousPinnacleServers) !== JSON.stringify(updatedPinnacleServers)) {
          pinnacleServers.setState(updatedPinnacleServers);
        }
      }
    }
  }

  return _pinnacleServers;
};

const scan = async () => {
  try {
    pinnacleServers.setState(await getPinnacleServers());
  } catch (error) {
    logError('Failed to scan for Pinnacle servers', error);
  }
};

const initScanNetworkForPinnacle = async () => {
  pinnacleServers.subscribe((newState) => {
    logger.info('Pinnacle Servers state updated — Pinnacle servers: ', newState);
  });

  // Initial scan
  await scan();
};

export async function startApp() {
  /**
   * 1. Create the pinnacle finder system
   * 2. Create the tray app (Next)
   * 3. Create the main syphon system to send the selected URL to the output stream
   */
  try {
    initScanNetworkForPinnacle();
    // createTrayApp();
    // createSyphon();

    const startWindow = async () => await createWindow({ nextPort: ports.next });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        startWindow().catch((error) => {
          logError('Window activation failed', error);
        });
      }
    });
  } catch (error) {
    logError('Application startup failed', error);
    throw error;
  }
}
