import { useEffect } from 'react';

export const useScreenAlwaysOn = () => {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        const error = err as { name?: string; message?: string };
        console.error(`${error.name}, ${error.message}`); // Todo: Log — Logger
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
  }, []);
};
