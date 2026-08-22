'use client';

import { Ports } from '@pinnacle/shared-types';
import { useEffect, useRef, useState } from 'react';

type UseIpAddressProps = {
  type: 'next' | 'socket';
};
export const useIpAddress = ({ type }: UseIpAddressProps = { type: 'next' }) => {
  const [ipAddress, setIpAddress] = useState('0.0.0.0');
  const [portNumber, setPortNumber] = useState(type === 'next' ? 3000 : 1234);
  const [ipChanged, setIpChanged] = useState(false);
  const currentIp = useRef(ipAddress);
  const currentPort = useRef(portNumber);
  const isFirstIp = useRef(true);

  const setIp = (ip?: string | null) => {
    const formattedIp = ip || window.location.hostname;
    if (currentIp.current !== formattedIp) {
      currentIp.current = formattedIp;
      setIpAddress(currentIp.current);
    }
  };

  const setPort = (port?: Ports) => {
    switch (type) {
      case 'socket':
        if (currentPort.current !== port?.socket) {
          if (!port?.socket) return;
          currentPort.current = port.socket;
          setPortNumber(currentPort.current);
        }
        return;
      case 'next':
      default:
        if (currentPort.current !== port?.next) {
          if (!port?.next) return;
          currentPort.current = port.next;
          setPortNumber(currentPort.current);
        }
        return;
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      unsubscribe = window?.electron?.onIpChanged?.((ip, port) => {
        setIp(ip);
        setPort(port);
      });

      const localIp = await window?.electron?.getLocalIp?.();
      setIp(localIp?.ip);
      setPort(localIp?.port);
    })();

    // Clean up the interval when component unmounts
    return () => {
      unsubscribe?.();
    };
    // Move this to unresponsive app troubleshooting method, not on a cron job
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const RESET_DELAY = 3_000;
    let windowTimer: ReturnType<typeof setTimeout> | undefined;
    const createResetTimer = () => setTimeout(() => setIpChanged(false), RESET_DELAY);

    if (ipAddress === '0.0.0.0' && portNumber === 3000) return;
    if (isFirstIp.current) {
      isFirstIp.current = false;
      return;
    }

    setIpChanged(true);

    if (typeof window !== 'undefined' && !window.document.hasFocus()) {
      const handleFocus = () => {
        windowTimer = createResetTimer();
      };

      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('focus', handleFocus);
        if (windowTimer) clearTimeout(windowTimer);
      };
    }

    const timer = createResetTimer();
    return () => {
      clearTimeout(timer);
      if (windowTimer) clearTimeout(windowTimer);
    };
  }, [ipAddress, portNumber]);

  return { ipAddress, portNumber, ipChanged };
};
