import { updateElectronApp } from 'update-electron-app';

import { logError } from './logger';

export function initUpdater() {
  try {
    updateElectronApp();
  } catch (error) {
    logError('Auto-update setup failed', error);
  }
}
