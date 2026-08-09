import { useEffect, useRef, useState } from 'react';

type UseIpAddressProps = {
  type: 'next' | 'socket';
};
export const useIpAddress = ({ type }: UseIpAddressProps = { type: 'next' }) => {
  const [ipAddress, setIpAddress] = useState('0.0.0.0');
  const [portNumber, setPortNumber] = useState(type === 'next' ? '3000' : '1234');
  const currentIp = useRef(ipAddress);
  const currentPort = useRef(portNumber);

  const setIp = (ip?: string | null) => {
    const formattedIp = ip || window.location.hostname;
    if (currentIp.current !== formattedIp) {
      currentIp.current = formattedIp;
      setIpAddress(currentIp.current);
    }
  };

  const setPort = (
    port?: {
      socket: string | null;
      next: string | null;
    } | null,
  ) => {
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

  return { ipAddress, portNumber };
};
