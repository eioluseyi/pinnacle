import { logError } from '@/electron/src/helpers/logger';
import { app, BrowserWindow, Tray, nativeImage } from 'electron';
import path from 'node:path';
import {
  trayState,
  popoverWindowState,
  offscreenWindowState,
  displayState,
  trayReadyState,
} from '@/electron/src/appState';

const __dirname = path.dirname(__filename);

export function getDisplay() {
  return displayState.value;
}

function togglePopover() {
  const popoverWindow = popoverWindowState.value;
  const tray = trayState.value;

  if (!popoverWindow || !tray) {
    logError('Popover window or tray is not initialized');
    return;
  }

  if (popoverWindow.isVisible()) {
    popoverWindow.hide();
    return;
  }

  const trayBounds = tray.getBounds();
  const popoverBounds = popoverWindow.getBounds();

  let x, y;
  if (process.platform === 'darwin') {
    x = Math.round(trayBounds.x + trayBounds.width / 2 - popoverBounds.width / 2);
    y = Math.round(trayBounds.y + trayBounds.height + 4);
  } else {
    x = Math.round(trayBounds.x + trayBounds.width / 2 - popoverBounds.width / 2);
    y = Math.round(trayBounds.y - popoverBounds.height - 4);
  }

  popoverWindow.setPosition(x, y, false);
  popoverWindow.show();
  popoverWindow.focus();
}

export function initTrayApp() {
  try {
    // Hide Dock icon on macOS
    if (process.platform === 'darwin' && app.dock) {
      app.dock.hide();
    }

    // Tray Icon Setup
    const iconPath =
      process.platform === 'darwin'
        ? path.join(__dirname, '../electron/assets/icon.png')
        : path.join(__dirname, '../electron/assets/icon.ico');

    const icon = nativeImage.createFromPath(iconPath);
    const newTray = new Tray(icon);
    newTray.setToolTip('Pinnacle Desktop Client');
    newTray.on('click', togglePopover);
    trayState.setState(newTray);

    // Popover UI Setup
    const newPopoverWindow = new BrowserWindow({
      width: 320,
      show: false,
      frame: false,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // newPopoverWindow.loadFile(path.join(__dirname, 'popover.html'));
    newPopoverWindow.loadURL('http://localhost:3000');
    newPopoverWindow.on('blur', () => newPopoverWindow?.hide());
    popoverWindowState.setState(newPopoverWindow);
    trayReadyState.setState(true);
  } catch (error) {
    logError('Failed to create tray app', error);
    throw error;
  }
}

export function shutdownTrayApp() {
  try {
    const popoverWindow = popoverWindowState.value;
    const offscreenWindow = offscreenWindowState.value;
    const tray = trayState.value;

    if (popoverWindow && !popoverWindow.isDestroyed()) {
      popoverWindow.destroy();
    }
    if (offscreenWindow && !offscreenWindow.isDestroyed()) {
      offscreenWindow.destroy();
    }
    if (tray) {
      tray.destroy();
    }

    // Clear the state
    popoverWindowState.setState(null);
    offscreenWindowState.setState(null);
    trayState.setState(null);
  } catch (error) {
    logError('Tray app shutdown failed', error);
  }
}
