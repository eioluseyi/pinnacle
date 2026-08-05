import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow } from 'electron/main';
import { startNextServer } from '../server/next-server.js';
import { startSocketServer } from '../server/socket-server.js';
import { getLocalIpAddress } from './utils.js';
import { ipcMain } from 'electron/main';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const preload = path.join(__dirname, 'preload.js');

let nextServer;
let socketServer;

const NEXT_PORT = 3000;
const SOCKET_PORT = 1234;
const IP_ADDRESS = getLocalIpAddress();

ipcMain.handle('get-local-ip', () => {
  return getLocalIpAddress();
});

async function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
    width: 960,
    height: 700,
  });

  await waitForServer(NEXT_PORT);
  await win.loadURL(`http://${IP_ADDRESS}:${NEXT_PORT}`);

  return win;
}

async function waitForServer(port) {
  while (true) {
    try {
      await fetch(`http://${IP_ADDRESS}:${port}`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

app.whenReady().then(async () => {
  nextServer = await startNextServer({
    port: NEXT_PORT,
  });

  socketServer = await startSocketServer({
    port: SOCKET_PORT,
  });

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  nextServer?.close();
  socketServer?.close();
});
