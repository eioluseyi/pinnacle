/* eslint-disable @next/next/no-img-element */
'use client';

import { ImageObject } from '@/app/controls/page';
import { useSocket } from '@/hooks/useSocket';
import { useEffect, useState } from 'react';

export default function Display() {
  const { socket, emit } = useSocket();
  const [displayData, setDisplayData] = useState<ImageObject>();

  useEffect(() => {
    socket?.on('connect', () => {
      emit?.('register-display');
    });

    socket?.on('display-updated', setDisplayData);

    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  return (
    <div className='flex-1 place-items-center grid'>
      {displayData?.src && (
        <img src={displayData?.src || ''} alt={displayData?.name || ''} className='w-full h-svh object-contain' />
      )}
    </div>
  );
}
