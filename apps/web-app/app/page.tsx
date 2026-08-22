/* eslint-disable @next/next/no-img-element */
'use client';

import { ImageObject } from '@/app/controls/page';
import { useIpAddress } from '@/hooks/useIpAddress';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function Display() {
  const [displayData, setDisplayData] = useState<ImageObject>();
  const { ipAddress } = useIpAddress();

  useEffect(() => {
    const socket = io(`http://${ipAddress}:1234`);

    socket.on('display-updated', (data) => {
      console.log('Received:', data);
      setDisplayData(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [ipAddress]);

  return (
    <div className='grid place-items-center flex-1'>
      {displayData?.src && (
        <img src={displayData?.src || ''} alt={displayData?.name || ''} className='w-full object-contain h-svh' />
      )}
    </div>
  );
}
