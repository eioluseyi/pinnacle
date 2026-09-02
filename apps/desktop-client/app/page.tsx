'use client';

import { useState } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      loadUrl: (url: string) => void;
    };
  }
}

export default function Home() {
  const [url, setUrl] = useState('');

  function submitUrl() {
    const trimmedUrl = url.trim();

    if (trimmedUrl && window.electronAPI) {
      window.electronAPI.loadUrl(trimmedUrl);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      submitUrl();
    }
  }

  return (
    <main className='bg-[#1e1e1e] p-3 min-h-screen font-sans text-white select-none'>
      <label htmlFor='urlInput' className='block text-[#aaa] text-[11px] uppercase tracking-[0.5px]'>
        Target Web URL
      </label>

      <input
        id='urlInput'
        type='url'
        placeholder='https://...'
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        className='bg-[#2d2d2d] my-1.5 mb-2.5 p-2 border border-[#444] focus:border-[#007acc] rounded outline-none w-full text-white placeholder:text-[#777]'
      />

      <button
        type='button'
        onClick={submitUrl}
        className='bg-[#007acc] hover:bg-[#005999] p-2 rounded w-full font-semibold text-white cursor-pointer'>
        Set Output Stream
      </button>
    </main>
  );
}
