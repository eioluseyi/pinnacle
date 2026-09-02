import { initScanNetworkForPinnacle } from '@/electron/src/helpers/discovery';
import { bindProcessGuards, logError } from '@/electron/src/helpers/logger';
import { createTrayApp } from '@/electron/src/helpers/tray';
import { initSentry } from '@/electron/src/lib/sentry';
import { app, BrowserWindow } from 'electron/main';

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
    createTrayApp();
    // createSyphon();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        // startWindow().catch((error) => {
        //   logError('Window activation failed', error);
        // });
      }
    });
  } catch (error) {
    logError('Application startup failed', error);
    throw error;
  }
}
