'use client';

import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      getDiscoveredServers: () => Promise<{ host: string; port: number }[]>;
      getServerState: () => Promise<{
        servers: { host: string; port: number }[];
        isScanning: boolean;
      }>;
      refreshSearch: () => Promise<{ host: string; port: number }[]>;
      onServersChanged: (callback: (servers: { host: string; port: number }[]) => void) => () => void;
      onScanningChanged: (callback: (isScanning: boolean) => void) => () => void;

      setOutputStream: (url: string) => Promise<void>;
      disconnectStream: () => Promise<void>;
      getStreamUrl: () => Promise<string | null>;
      onStreamUrlChanged: (callback: (url: string | null) => void) => () => void;
      getLifecycleStatus: () => Promise<string>;
      onLifecycleStatusChanged: (callback: (status: string) => void) => () => void;
      onDisplayFrame: (
        callback: (frame: { buffer: Uint8ClampedArray; size: { width: number; height: number } }) => void,
      ) => () => void;
    };
  }
}

interface DiscoveredServer {
  host: string;
  port: number;
  name?: string;
}

type SyphonStatus = 'idle' | 'live';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState('');
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState('Starting');
  const connectedServer = discoveredServers.find((server) => formatServerUrl(server) === url) ?? null;

  function formatServerUrl(server: DiscoveredServer): string {
    return `http://${server.host}:${server.port}`;
  }

  async function submitUrl(nextUrl = url) {
    const trimmedUrl = nextUrl.trim();
    const electronApi = window.electronAPI;
    if (!trimmedUrl || !electronApi) return;

    await electronApi.setOutputStream(trimmedUrl);
  }

  function handleServerClick(server: DiscoveredServer) {
    const serverUrl = formatServerUrl(server);
    submitUrl(serverUrl);
  }

  async function handleRefreshSearch() {
    const electronApi = window.electronAPI;
    if (!electronApi) return;

    setIsScanning(true);

    try {
      const servers = await electronApi.refreshSearch();
      setDiscoveredServers(servers);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleDisconnect() {
    const electronApi = window.electronAPI;
    if (electronApi) {
      await electronApi.disconnectStream();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      submitUrl();
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const electronApi = window.electronAPI;

    let mounted = true;

    electronApi.getServerState().then((state) => {
      if (!mounted) return;
      setDiscoveredServers(state.servers);
      setIsScanning(state.isScanning);
    });

    electronApi.getStreamUrl().then((streamUrl) => {
      if (mounted) setUrl(streamUrl ?? '');
    });

    electronApi.getLifecycleStatus().then((status) => {
      if (mounted) setLifecycleStatus(status);
    });

    const removeServersListener = electronApi.onServersChanged((servers) => {
      setDiscoveredServers(servers);
    });

    const removeScanningListener = electronApi.onScanningChanged((isScanning) => {
      setIsScanning(isScanning);
    });

    const removeUrlListener = electronApi.onStreamUrlChanged((streamUrl) => {
      setUrl(streamUrl ?? '');
    });

    const removeLifecycleListener = electronApi.onLifecycleStatusChanged((status) => {
      setLifecycleStatus(status);
    });

    const removeDisplayFrameListener = electronApi.onDisplayFrame((frame) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (canvas.width !== frame.size.width || canvas.height !== frame.size.height) {
        canvas.width = frame.size.width;
        canvas.height = frame.size.height;
      }

      const context = canvas.getContext('2d');
      if (!context) return;

      const pixelData = new Uint8ClampedArray(frame.buffer.length);
      pixelData.set(frame.buffer);
      context.putImageData(new ImageData(pixelData, frame.size.width, frame.size.height), 0, 0);
    });

    return () => {
      mounted = false;
      removeServersListener();
      removeScanningListener();
      removeUrlListener();
      removeLifecycleListener();
      removeDisplayFrameListener();
    };
  }, []);

  return (
    <main className='flex flex-col bg-[#1e1e1e] p-2 min-h-screen font-sans text-white select-none'>
      <div className='p-2'>
        {/* Header */}
        <div className='mb-4'>
          <h1 className='flex items-center gap-1 mb-1 font-semibold text-md'>
            <img src='/icon.png' alt='Pinnacle' className='h-5' />
            <span>Pinnacle client</span>
          </h1>
          {/* <p className='text-[#aaa] text-xs'>AV Streaming & Screen Distribution Utility</p> */}
        </div>

        {/* Syphon Status Bar */}
        <div className='flex items-center gap-2 mb-4 pb-3 border-[#444] border-b'>
          {/* <div
            className={`w-2.5 h-2.5 rounded-full ${syphonStatus === 'live' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}
          /> */}
          <span className='font-semibold text-xs tracking-wider'>{lifecycleStatus}</span>
        </div>

        <canvas ref={canvasRef} className='block bg-[#2d2d2d] mb-4 border border-[#444] rounded w-full aspect-video' />

        {/* Discovered Servers */}
        <div className='mb-4'>
          <label className='block mb-2 font-semibold text-[#aaa] text-[10px] uppercase tracking-[0.5px]'>
            Discovered Servers
          </label>

          <div className='space-y-1.5'>
            {discoveredServers.map((server, idx) => {
              const isConnected = connectedServer === server;
              return (
                <button
                  key={idx}
                  onClick={() => handleServerClick(server)}
                  className={`w-full text-left p-2 rounded border transition-colors ${
                    isConnected
                      ? 'bg-[#0e639c] border-[#007acc]'
                      : 'bg-[#2d2d2d] border-[#444] hover:border-[#555] hover:bg-[#333]'
                  }`}>
                  <div className='flex justify-between items-center'>
                    <div className='flex-1'>
                      <p className='font-semibold text-white text-xs'>{server.name}</p>
                      <p className='text-[#bbb] text-[10px]'>
                        {server.host}:{server.port}
                      </p>
                    </div>
                    {isConnected && (
                      <span className='ml-2 font-bold text-[10px] text-green-400 uppercase tracking-wider'>ACTIVE</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {isScanning && (
            <div className='bg-[#2d2d2d] mt-2 p-3 border border-[#444] rounded text-[#aaa] text-xs'>
              <p className='mb-1'>Scanning network...</p>
              <p className='text-[#777]'>Looking for Pinnacle streaming nodes</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Server URL */}
      {/* <div className='mb-4'>
        <label
          htmlFor='urlInput'
          className='block mb-2 font-semibold text-[#aaa] text-[10px] uppercase tracking-[0.5px]'>
          Manual Server URL
        </label>

        <input
          id='urlInput'
          type='url'
          placeholder='http://192.168.1.x:3000'
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          className='bg-[#2d2d2d] mb-2 p-2.5 border border-[#444] focus:border-[#007acc] rounded outline-none w-full text-white placeholder:text-[#777] text-sm'
        />
      </div> */}

      {/* Action Buttons */}
      <div className='gap-1 grid mt-auto'>
        <button
          type='button'
          onClick={handleRefreshSearch}
          disabled={isScanning}
          className='flex-1 bg-[#444] hover:bg-[#555] disabled:opacity-50 p-2.5 rounded font-semibold text-white text-xs uppercase tracking-wide transition-colors cursor-pointer'>
          {isScanning ? 'Scanning...' : 'Refresh Search'}
        </button>

        {/* <button
          type='button'
          onClick={submitUrl}
          className='flex-1 bg-[#007acc] hover:bg-[#005999] p-2.5 rounded font-semibold text-white text-xs uppercase tracking-wide transition-colors cursor-pointer'>
          Set Output Stream
        </button> */}

        {connectedServer && (
          <button
            type='button'
            onClick={handleDisconnect}
            className='bg-red-600 hover:bg-red-700 p-2.5 rounded font-semibold text-white text-xs transition-colors cursor-pointer'
            title='Disconnect Stream'>
            ✕
          </button>
        )}
      </div>
    </main>
  );
}
