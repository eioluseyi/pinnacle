/* eslint-disable @next/next/no-img-element */
'use client';

import { ImageObject } from '@/app/page';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function Display() {
  const [displayData, setDisplayData] = useState<ImageObject>();

  useEffect(() => {
    const socket = io('http://localhost:1234');

    socket.on('display-updated', (data) => {
      console.log('Received:', data);
      setDisplayData(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className='grid place-items-center flex-1'>
      {displayData?.src && <img src={displayData?.src || ''} alt={displayData?.name || ''} className='w-full h-auto' />}
    </div>
  );
}
