import { init as initElectronRenderer } from '@sentry/electron/renderer';
import { captureException, captureMessage, init as initReact } from '@sentry/react';
import desktopPackage from '@pinnacle/desktop/package.json';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { createSentryErrorReporter, getSentryDsn, isSentryEnabled, setErrorReporter } from '@pinnacle/utils';

let initialized = false;

const initializeSentry = () => {
  if (initialized || !isSentryEnabled()) {
    return;
  }

  initialized = true;

  const isElectron = typeof window !== 'undefined' && Boolean(window.electron);

  if (isElectron) {
    initElectronRenderer({}, initReact);
  } else {
    initReact({
      dsn: getSentryDsn(),
      environment: process.env.NODE_ENV,
      release: `pinnacle@${desktopPackage.version}`,
      enableLogs: true,
    });
  }

  setErrorReporter(createSentryErrorReporter(captureException, captureMessage));
};

export function useSentryClient() {
  initializeSentry();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error ?? new Error(event.message || 'Unknown browser error');
      Sentry.captureException(error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      Sentry.captureException(reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}
