/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  onIpChanged: (callback) => {
    const listener = (_, ip, port) => callback(ip, port);
    ipcRenderer.on('network:ip-changed', listener);
    return () => {
      ipcRenderer.removeListener('network:ip-changed', listener);
    };
  },
});
