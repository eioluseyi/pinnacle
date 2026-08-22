import { useIpAddress } from '@/hooks/useIpAddress';
import { useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const socketRef = useRef<Socket>(null);
  const { ipAddress } = useIpAddress();

  const socket = useMemo(() => {
    // Connect to your Express server URL
    socketRef.current = io(`http://${ipAddress}:1234`);
    return socketRef.current;
  }, [ipAddress]);

  const emit = (key: string, payload?: unknown) => socket?.emit(key, payload);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const controls = { socket, emit };

  return controls;
};
