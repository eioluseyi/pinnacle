import { ipcMain } from 'electron/main';
import { logError, ports } from './helper';
import { getLocalIpAddress } from '@pinnacle/utils';

export const initIpcHandlers = () => {
  ipcMain.handle('get-local-ip', () => {
    try {
      const ip = getLocalIpAddress();
      return { ip, port: ports };
    } catch (error) {
      logError('Failed to resolve local IP', error);
      return { ip: '0.0.0.0', port: ports };
    }
  });
};
