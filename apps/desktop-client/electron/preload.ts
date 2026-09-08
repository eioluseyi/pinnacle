type DiscoveredServer = {
  host: string;
  port: number;
  name?: string;
};

type ServerState = {
  servers: DiscoveredServer[];
  isScanning: boolean;
};

type DisplayFrame = {
  buffer: Uint8ClampedArray;
  size: { width: number; height: number };
};

/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDiscoveredServers: () => ipcRenderer.invoke('servers:get'),
  getServerState: (): Promise<ServerState> => ipcRenderer.invoke('servers:get-state'),

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

  onScanningChanged: (callback: (isScanning: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, isScanning: boolean) => callback(isScanning);
    ipcRenderer.on('servers:scanning-changed', listener);
    return () => ipcRenderer.removeListener('servers:scanning-changed', listener);
  },

  setOutputStream: (url: string) => ipcRenderer.invoke('stream:set-url', url),

  disconnectStream: () => ipcRenderer.invoke('stream:disconnect'),

  getStreamStatus: () => ipcRenderer.invoke('stream:get-status'),
  getStreamUrl: (): Promise<string | null> => ipcRenderer.invoke('stream:get-url'),

  onStreamStatusChanged: (callback: (status: 'idle' | 'live') => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: 'idle' | 'live') => {
      callback(status);
    };

    ipcRenderer.on('stream:status-changed', listener);

    return () => {
      ipcRenderer.removeListener('stream:status-changed', listener);
    };
  },

  onStreamUrlChanged: (callback: (url: string | null) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, url: string | null) => callback(url);
    ipcRenderer.on('stream:url-changed', listener);
    return () => ipcRenderer.removeListener('stream:url-changed', listener);
  },

  getLifecycleStatus: (): Promise<string> => ipcRenderer.invoke('app:get-lifecycle'),

  onLifecycleStatusChanged: (callback: (status: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: string) => callback(status);
    ipcRenderer.on('app:lifecycle-changed', listener);
    return () => ipcRenderer.removeListener('app:lifecycle-changed', listener);
  },

  onDisplayFrame: (callback: (frame: DisplayFrame) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, frame: DisplayFrame) => callback(frame);
    ipcRenderer.on('display:frame', listener);
    return () => ipcRenderer.removeListener('display:frame', listener);
  },
});
