import { BrowserWindow, Tray } from 'electron';
import { createState } from '@/electron/src/lib/state';

export const pinnacleServers = createState<{ host: string; port: number }[]>([]);
export const networkIPs = createState<string[]>([]);
export const cacheNetworkIPs = createState(false);

// Tray state
export const trayState = createState<Tray | null>(null);
export const popoverWindowState = createState<BrowserWindow | null>(null);
export const offscreenWindowState = createState<BrowserWindow | null>(null);
export const displayState = createState<{
  buffer: Uint8ClampedArray;
  size: { width: number; height: number };
} | null>(null);
export const renderServerState = createState<any>(null);
export const renderServerHasClientState = createState(false);
export const trayReadyState = createState(false);
export const displayUrlState = createState<string | null>(null);
export const scanningState = createState(false);
export const appLifecycleState = createState('Starting');
