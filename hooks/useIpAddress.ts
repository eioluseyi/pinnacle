import { useEffect, useState } from 'react';

export const useIpAddress = () => {
  const [ipAddress, setIpAddress] = useState('0.0.0.0');

  useEffect(() => {
    let currentIp = ipAddress;
    let unsubscribe: (() => void) | undefined;

    const updateIpAddress = async () => {
      unsubscribe = window?.electron?.onIpChanged?.((ip) => {
        if (ip) setIpAddress(ip);
      });
      const newIp = (await window.electron?.getLocalIp?.()) || window.location.hostname;
      // Only update state and interval timer if IP has changed
      if (newIp !== currentIp) {
        currentIp = newIp;
        setIpAddress(newIp);
        // Clear old interval and start a new one with appropriate delay
        clearInterval(timerId);
        timerId = setInterval(updateIpAddress, 60_000);
      }
    };

    // Use ref to store timerId so clearInterval works correctly
    let timerId = setInterval(updateIpAddress, 500);

    // Clean up the interval when component unmounts
    return () => {
      clearInterval(timerId);
      unsubscribe?.();
    };
    // Move this to unresponsive app troubleshooting method, not on a cron job
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ipAddress };
};
