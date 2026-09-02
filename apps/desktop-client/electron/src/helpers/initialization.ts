import { app, BrowserWindow } from 'electron/main';

import { bindProcessGuards, logError } from './logger';
import { ports } from './ports';
import { createWindow } from './server';
import { initScanNetworkForPinnacle } from './discovery';
import { initSentry } from '@/electron/src/lib/sentry';

export const getIsDev = () => !app.isPackaged;

export function initErrorListeners() {
  try {
    initSentry();
    bindProcessGuards();
  } catch (error) {
    console.error('Sentry initialization failed:', error);
    bindProcessGuards();
  }
}

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
