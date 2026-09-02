import {
  displayState,
  displayUrlState,
  offscreenWindowState,
  renderServerHasClientState,
  renderServerState,
} from '@/electron/src/appState';
import { logError, logger } from '@/electron/src/helpers/logger';
import { BrowserWindow } from 'electron/main';
// node-syphon does not currently ship TypeScript declarations.
// @ts-expect-error Module has no declaration file.
import { SyphonOpenGLServer } from 'node-syphon';

const FALLBACK_URL = 'about:blank'; // Todo: Use custom blank page (Pinnacle Splash Screen)

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
    return new SyphonOpenGLServer('Pinnacle');
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
    newOffscreenWindow.loadURL(url); // Load the specified URL or leave blank
  });

  newOffscreenWindow.loadURL(displayUrlState.value || FALLBACK_URL);
};

const publish = (display: typeof displayState.value) => {
  const renderServer = renderServerState.value;

  // Send to render server
  if (!renderServer || !display) return;

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

const initRenderer = () => {
  setInterval(() => {
    publish(displayState.value);
    const serverHasClient = renderServerState.value.hasClient;
    renderServerHasClientState.setState(serverHasClient);
  }, 1000 / 60); // 60 FPS
};

export const initDisplay = async () => {
  renderServerState.subscribe((server) => {
    if (!server) return logger.info('Render server stopped');
    logger.info('Render server started');
  });
  const renderServer = getRenderServer();
  renderServerState.setState(renderServer);
  displayState.subscribe(publish);
  initBrowserBuffer();
  initRenderer();
};
