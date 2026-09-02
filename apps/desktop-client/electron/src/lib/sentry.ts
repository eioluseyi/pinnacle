import * as Sentry from '@sentry/electron/main';
import { app } from 'electron/main';
import { createSentryErrorReporter, getSentryDsn, isSentryEnabled, setErrorReporter } from '@pinnacle/utils';

export function initSentry() {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.init({
    dsn: getSentryDsn(),
    environment: app.isPackaged ? 'production' : 'development',
    release: `pinnacle-client@${app.getVersion()}`,
    enableLogs: true,
  });

  setErrorReporter(createSentryErrorReporter(Sentry.captureException, Sentry.captureMessage));
}
