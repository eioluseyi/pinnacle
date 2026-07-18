import { app, BrowserWindow } from 'electron/main';
import { startNextServer } from '../server/next-server.js';
import { startSocketServer } from '../server/socket-server.js';

let nextServer;
let socketServer;

const NEXT_PORT = 3000;
const SOCKET_PORT = 1234;

const isProd = app.isPackaged;

async function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 700,
  });

  await waitForServer(NEXT_PORT);
  await win.loadURL(`http://localhost:${NEXT_PORT}`);

  return win;
}

async function waitForServer(port) {
  while (true) {
    try {
      await fetch(`http://localhost:${port}`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

app.whenReady().then(async () => {
  // if (isProd) {
  nextServer = await startNextServer({
    port: NEXT_PORT,
  });

  socketServer = await startSocketServer({
    port: SOCKET_PORT,
  });
  // }

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
