import {
  displayState,
  displayUrlState,
  offscreenWindowState,
  popoverWindowState,
  pinnacleServers,
  appLifecycleState,
  renderServerState,
  scanningState,
  AppLifecycleStatus,
  trayState,
} from '@/electron/src/appState';
import { logError } from '@/electron/src/helpers/logger';
import { nativeImage } from 'electron';
import { app, BrowserWindow } from 'electron/main';
// node-syphon does not currently ship TypeScript declarations.
// @ts-expect-error Module has no declaration file.
import { SyphonOpenGLServer } from 'node-syphon';
import path from 'node:path';

const FALLBACK_URL = (() => {
  if (!app.isPackaged) return 'http://localhost:3005/blank';
  return 'pinnacle://app/blank';
})();

const handlePaintEvent = (image: Electron.NativeImage) => {
  try {
    const size = image.getSize();
    const buffer = image.toBitmap();

    // Create a fast 32-bit View over the raw array buffer
    // This allows us to process 4 bytes (1 whole pixel) at a time
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Todo: Check if this is needed. The Syphon API might be able to handle the color format directly.
    // Loop through every pixel and swap Blue (Byte 0) with Red (Byte 2)
    for (let i = 0; i < view.byteLength; i += 4) {
      const b = view.getUint8(i); // Byte 0: Blue
      const r = view.getUint8(i + 2); // Byte 2: Red

      view.setUint8(i, r); // Move Red to Byte 0 position
      view.setUint8(i + 2, b); // Move Blue to Byte 2 position
    }

    // Wrap the corrected buffer into the Uint8ClampedArray Syphon needs
    const clampedArray = new Uint8ClampedArray(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    if (process.platform === 'darwin') {
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
};

const getRenderServer = () => {
  if (process.platform === 'darwin') {
    return new SyphonOpenGLServer('Live Stream');
  }
  return null; // For Windows, you would return your Spout server instance here
};

const initBrowserBuffer = () => {
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
  offscreenWindowState.setState(newOffscreenWindow); // Register the offscreen window in the state

  // Get raw frames from the offscreen window and update the displayState with the pixel data
  newOffscreenWindow.webContents.on('paint', (_event, _dirty, image) => handlePaintEvent(image));

  displayUrlState.subscribe((newUrl) => {
    const url = newUrl || FALLBACK_URL;
    newOffscreenWindow.loadURL(url);
  });

  const url = displayUrlState.value || FALLBACK_URL;
  newOffscreenWindow.loadURL(url);
};

const broadcastFrame = (display: typeof displayState.value) => {
  const previewWindow = popoverWindowState.value;
  if (!display || !previewWindow || previewWindow.isDestroyed()) return;

  previewWindow.webContents.send('display:frame', display);
};

const publish = (display: typeof displayState.value) => {
  const renderServer = renderServerState.value;

  // Send to render server
  if (!renderServer || !display) return;

  broadcastFrame(display); // To mirror the display in the popover window
  renderServer.publishImageData(
    display.buffer,

    // Region.
    { x: 0, y: 0, width: display.size.width, height: display.size.height },

    // Texture dimensions.
    { width: display.size.width, height: display.size.height },

    // Flipped.
    true,

    // Texture target (defaults to 'GL_RECTANGLE_EXT').
    'GL_TEXTURE_2D',
  );
};

const setStatusIcon = (status: AppLifecycleStatus) => {
  const tray = trayState.value;
  if (!tray) return;

  let iconPath = '';
  switch (status) {
    case AppLifecycleStatus.Scanning:
      iconPath = path.join(__dirname, '../electron/assets/icon.png');
      break;
    case AppLifecycleStatus.Idle:
      iconPath = path.join(__dirname, '../electron/assets/icon-red.png');
      break;
    case AppLifecycleStatus.Live:
      iconPath = path.join(__dirname, '../electron/assets/icon-green.png');
      break;
    case AppLifecycleStatus.Ready:
      iconPath = path.join(__dirname, '../electron/assets/icon-grey.png');
      break;
    default:
      iconPath = path.join(__dirname, '../electron/assets/icon.png');
  }
  const icon = nativeImage.createFromPath(iconPath);
  tray.setImage(icon);
};

const initRenderer = () => {
  setInterval(() => {
    publish(displayState.value);
    const serverHasClients = Boolean(renderServerState.value?.hasClients);
    const status = (() => {
      if (serverHasClients && displayUrlState.value) return AppLifecycleStatus.Live;
      if (scanningState.value) return AppLifecycleStatus.Scanning;
      if (!pinnacleServers.value.length || !displayUrlState.value) return AppLifecycleStatus.Idle;
      return AppLifecycleStatus.Ready;
    })();

    setStatusIcon(status);
    appLifecycleState.setState(status);
  }, 1000 / 60); // 60 FPS
};

export const initDisplay = async () => {
  const renderServer = getRenderServer();
  renderServerState.setState(renderServer);
  displayState.subscribe(publish);
  initBrowserBuffer();
  initRenderer();
};
