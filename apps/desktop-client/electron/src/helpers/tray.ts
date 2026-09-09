import { logError } from '@/electron/src/helpers/logger';
import { app, BrowserWindow, Tray, nativeImage, protocol, net } from 'electron';
import path from 'node:path';
import {
  trayState,
  popoverWindowState,
  offscreenWindowState,
  displayState,
  trayReadyState,
  appLifecycleState,
} from '@/electron/src/appState';
import { pathToFileURL } from 'node:url';

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

export function setTrayStatus(status: string) {
  const tray = trayState.value;
  if (!tray) return;

  tray.setTitle(` ${status}`);
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
    newTray.setToolTip('Pinnacle client');
    newTray.on('click', togglePopover);
    trayState.setState(newTray);
    appLifecycleState.subscribe(setTrayStatus);
    setTrayStatus(appLifecycleState.value);

    const preload = path.join(__dirname, 'preload.cjs');
    // Popover UI Setup
    const newPopoverWindow = new BrowserWindow({
      width: 320,
      show: false,
      frame: false,
      type: 'panel',
      resizable: false,
      movable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    if (process.platform === 'darwin') {
      newPopoverWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      newPopoverWindow.setAlwaysOnTop(true, 'pop-up-menu');
    }

    protocol.handle('pinnacle', (request) => {
      const requestUrl = new URL(request.url);
      const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
      const resourcePath = path.extname(relativePath)
        ? relativePath
        : relativePath
          ? path.join(relativePath, 'index.html')
          : 'index.html';
      const filePath = path.join(__dirname, '../next', resourcePath);
      return net.fetch(pathToFileURL(filePath).toString());
    });

    if (!app.isPackaged) {
      newPopoverWindow.loadURL('http://localhost:3005');
    } else {
      newPopoverWindow.loadURL('pinnacle://app/');
    }

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
