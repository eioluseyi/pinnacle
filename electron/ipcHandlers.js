import { ipcMain } from 'electron/main';
import { logError } from './helper.js';
import { getLocalIpAddress } from './utils.js';

const NEXT_PORT = 3000;
const SOCKET_PORT = 1234;

export const initIpcHandlers = () => {
  ipcMain.handle('get-local-ip', () => {
    try {
      const ip = getLocalIpAddress();
      const port = { socket: SOCKET_PORT, next: NEXT_PORT };

      return { ip, port };
    } catch (error) {
      logError('Failed to resolve local IP', error);
      return { ip: '127.0.0.1', port: { socket: SOCKET_PORT, next: NEXT_PORT } };
    }
  });
};
