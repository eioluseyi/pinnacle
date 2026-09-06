type DiscoveredServer = {
  host: string;
  port: number;
  name?: string;
};

/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDiscoveredServers: () => ipcRenderer.invoke('servers:get'),

  refreshSearch: () => ipcRenderer.invoke('servers:scan'),

  onServersChanged: (callback: (servers: DiscoveredServer[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, servers: DiscoveredServer[]) => {
      callback(servers);
    };

    ipcRenderer.on('servers:changed', listener);

    return () => {
      ipcRenderer.removeListener('servers:changed', listener);
    };
  },

  setOutputStream: (url: string) => ipcRenderer.invoke('stream:set-url', url),

  disconnectStream: () => ipcRenderer.invoke('stream:disconnect'),

  getStreamStatus: () => ipcRenderer.invoke('stream:get-status'),

  onStreamStatusChanged: (callback: (status: 'idle' | 'live') => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: 'idle' | 'live') => {
      callback(status);
    };

    ipcRenderer.on('stream:status-changed', listener);

    return () => {
      ipcRenderer.removeListener('stream:status-changed', listener);
    };
  },
});
