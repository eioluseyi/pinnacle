'use client';

import { ImageObject } from '@/app/page';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function Display() {
  const [displayData, setDisplayData] = useState<ImageObject>();

  useEffect(() => {
    const socket = io('http://192.168.1.143:1234');

    socket.on('display-updated', (data) => {
      console.log('Received:', data);
      setDisplayData(data);
    });

    return () => socket.disconnect();
  }, []);

  console.log({ displayData });

  return (
    <div className='grid place-items-center flex-1'>
      {displayData?.src && (
        <Image
          src={displayData?.src || ''}
          alt={displayData?.name || ''}
          className='w-full h-auto'
          width={1000}
          height={1000}
        />
      )}
    </div>
  );
}
