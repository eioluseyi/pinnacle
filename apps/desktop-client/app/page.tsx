'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      loadUrl: (url: string) => void;
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
  const [url, setUrl] = useState('');
  const [syphonStatus, setSyphonStatus] = useState<SyphonStatus>('idle');
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([
    // { host: '192.168.1.10', port: 3000, name: 'Display 1' },
    // { host: '192.168.1.10', port: 3001, name: 'Display 2' },
    // { host: '192.168.1.11', port: 3002, name: 'Display 3' },
    // { host: '192.168.1.12', port: 3005, name: 'Lobby Screen' },
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedServer, setConnectedServer] = useState<DiscoveredServer | null>(null);

  function formatServerUrl(server: DiscoveredServer): string {
    return `${server.host}:${server.port}`;
  }

  function submitUrl() {
    const trimmedUrl = url.trim();

    if (trimmedUrl && window.electronAPI) {
      window.electronAPI.loadUrl(trimmedUrl);
      // Parse and set as connected server if it matches a discovered one
      const matched = discoveredServers.find((s) => formatServerUrl(s) === trimmedUrl);
      if (matched) {
        setConnectedServer(matched);
        setSyphonStatus('live');
      }
    }
  }

  function handleServerClick(server: DiscoveredServer) {
    const serverUrl = formatServerUrl(server);
    setUrl(serverUrl);
    submitUrl();
  }

  function handleRefreshSearch() {
    setIsScanning(true);
    // Simulate network scan
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  }

  function handleDisconnect() {
    setUrl('');
    setConnectedServer(null);
    setSyphonStatus('idle');
    if (window.electronAPI) {
      window.electronAPI.loadUrl('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      submitUrl();
    }
  }

  return (
    <main className='flex flex-col bg-[#1e1e1e] p-2 min-h-screen font-sans text-white select-none'>
      <div className='p-2'>
        {/* Header */}
        <div className='mb-4'>
          <h1 className='flex items-center gap-1 mb-1 font-semibold text-md'>
            <img src='/icon.png' alt='Pinnacle' className='h-5' />
            <span>Pinnacle Desktop Client</span>
          </h1>
          {/* <p className='text-[#aaa] text-xs'>AV Streaming & Screen Distribution Utility</p> */}
        </div>

        {/* Syphon Status Bar */}
        <div className='flex items-center gap-2 mb-4 pb-3 border-[#444] border-b'>
          <div
            className={`w-2.5 h-2.5 rounded-full ${syphonStatus === 'live' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}
          />
          <span className='font-semibold text-xs capitalize tracking-wider'>Syphon {syphonStatus}</span>
        </div>

        {/* Discovered Servers */}
        <div className='mb-4'>
          <label className='block mb-2 font-semibold text-[#aaa] text-[10px] uppercase tracking-[0.5px]'>
            Discovered Servers
          </label>

          {isScanning && (
            <div className='bg-[#2d2d2d] mb-2 p-3 border border-[#444] rounded text-[#aaa] text-xs'>
              <p className='mb-1'>Scanning network...</p>
              <p className='text-[#777]'>Looking for Pinnacle streaming nodes</p>
            </div>
          )}

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
