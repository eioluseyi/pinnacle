import { useIpAddress } from '@/hooks/useIpAddress';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const socket = useRef<Socket>(null);
  const { ipAddress } = useIpAddress();

  const emit = (key: string, payload: unknown) => socket.current?.emit(key, payload);

  useEffect(() => {
    // Connect to your Express server URL
    socket.current = io(`http://${ipAddress}:1234`);

    // Cleanup on unmount
    return () => {
      socket.current?.disconnect();
    };
  }, [ipAddress]);

  const controls = { socket, emit };

  return controls;
};
