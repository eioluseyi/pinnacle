import util from 'node:util';
import child_process from 'node:child_process';
import { getLocalIpAddress } from '@pinnacle/utils';

import { cacheNetworkIPs, displayUrlState, networkIPs, pinnacleServers } from '@/electron/src/appState';
import { getActiveBroadcastAddress, pingBroadcast } from '@/electron/src/helpers/network';
import { logError, logger } from '@/electron/src/helpers/logger';

const exec = util.promisify(child_process.exec);

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

const getUrl = ({ host, port }: { host: string; port: number }) => `http://${host}:${port}`;

export const initScan = async () => {
  pinnacleServers.subscribe((newState) => {
    displayUrlState.setState(getUrl(newState[0]));
    logger.info('Pinnacle Servers state updated — Pinnacle servers: ', newState);
  });

  // Initial scan
  await scan();
};
