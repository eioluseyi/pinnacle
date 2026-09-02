import { logError } from '@/electron/src/helpers/logger';
import { app, BrowserWindow, Tray, nativeImage } from 'electron';
import path from 'node:path';
import {
  trayState,
  popoverWindowState,
  offscreenWindowState,
  displayState,
  syphonServerState,
} from '@/electron/src/appState';

const __dirname = path.dirname(__filename);

export function setSyphonServer(server: any) {
  syphonServerState.setState(server);
}

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

export function createTrayApp() {
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
      height: 150,
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

    // Offscreen Renderer Setup
    const newOffscreenWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      show: false,
      webPreferences: {
        offscreen: true,
      },
    });

    newOffscreenWindow.webContents.setFrameRate(60);
    offscreenWindowState.setState(newOffscreenWindow);

    // Stream raw frames to Syphon / Spout
    newOffscreenWindow.webContents.on('paint', (event, dirty, image) => {
      try {
        const size = image.getSize();
        const buffer = image.toBitmap();

        // 2. Create a fast 32-bit View over the raw array buffer
        // This allows us to process 4 bytes (1 whole pixel) at a time
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        // 3. Loop through every pixel and swap Blue (Byte 0) with Red (Byte 2)
        for (let i = 0; i < view.byteLength; i += 4) {
          const b = view.getUint8(i); // Byte 0: Blue
          const r = view.getUint8(i + 2); // Byte 2: Red

          view.setUint8(i, r); // Move Red to Byte 0 position
          view.setUint8(i + 2, b); // Move Blue to Byte 2 position
        }

        // 4. Wrap the corrected buffer into the Uint8ClampedArray Syphon needs
        const clampedArray = new Uint8ClampedArray(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        if (process.platform === 'darwin' && syphonServerState.value) {
          try {
            displayState.setState({ buffer: clampedArray, size });
          } catch (err) {
            logError('Error publishing to Syphon', err);
          }
        }
        // Windows Spout logic attaches here
      } catch (err) {
        logError('Error processing paint event', err);
      }
    });

    newOffscreenWindow.loadURL('http://10.248.96.175:3000'); // Load a default URL or leave blank
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
