import { initScan } from '@/electron/src/helpers/discovery';
import { bindProcessGuards, logError } from '@/electron/src/helpers/logger';
import { initDisplay } from '@/electron/src/helpers/renderServer';
import { initTrayApp } from '@/electron/src/helpers/tray';
import { initSentry } from '@/electron/src/lib/sentry';
import { app } from 'electron/main';

export const getIsDev = () => !app.isPackaged;

export function initErrorListeners() {
  try {
    initSentry();
  } catch (error) {
    console.error('Sentry initialization failed:', error);
  } finally {
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
    initTrayApp();
    initDisplay();
    initScan();
  } catch (error) {
    logError('Application startup failed', error);
    throw error;
  }
}
