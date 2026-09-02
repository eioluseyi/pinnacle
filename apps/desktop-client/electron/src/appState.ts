import { createState } from '@/electron/src/lib/state';

export const pinnacleServers = createState<{ host: string; port: number }[]>([]);
export const networkIPs = createState<string[]>([]);
export const cacheNetworkIPs = createState(false);
