import { useLogger } from '@/hooks/useLogger';
import { useEffect } from 'react';

export const useScreenAlwaysOn = () => {
  const logger = useLogger('wake-lock');

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        const error = err as { name?: string; message?: string };
        logger.error(`${error.name}, ${error.message}`);
      }
    }

    async function releaseWakeLock() {
      if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
      }
    }

    document.addEventListener('visibilitychange', async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    });

    requestWakeLock();

    return () => {
      releaseWakeLock();
    };
  }, [logger]);
};
