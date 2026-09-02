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
export const syphonServerState = createState<any>(null);
