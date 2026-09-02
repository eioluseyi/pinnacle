import { BrowserWindow, powerMonitor } from 'electron/main';
import { getLocalIpAddress } from '@pinnacle/utils';
import util from 'node:util';
import child_process from 'node:child_process';
import os from 'os';

import { ports } from './ports';
import { logError, logger } from './logger';

const exec = util.promisify(child_process.exec);

export function getActiveBroadcastAddress() {
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
export async function pingBroadcast(broadcastAddress?: string | null) {
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
