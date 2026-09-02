import { IpChangedCallback, Ports } from '@pinnacle/shared-types';

/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  onIpChanged: (callback: IpChangedCallback) => {
    const listener = (_event: Electron.IpcRendererEvent, ip: string, port: Ports) => callback(ip, port);
    ipcRenderer.on('network:ip-changed', listener);
    return () => {
      ipcRenderer.removeListener('network:ip-changed', listener);
    };
  },
});
