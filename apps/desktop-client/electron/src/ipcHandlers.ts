import { ipcMain } from 'electron/main';
import { getLocalIpAddress } from '@pinnacle/utils';
import { ports } from '@/electron/src/helpers/ports';
import { logError } from '@/electron/src/helpers/logger';

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
