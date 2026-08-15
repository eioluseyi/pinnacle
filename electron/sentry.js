import * as Sentry from '@sentry/electron/main';
import { app } from 'electron/main';
import { getSentryDsn, isSentryEnabled } from '../lib/sentry-config.js';
import { createSentryErrorReporter, setErrorReporter } from '../lib/sentry-report.js';

export function initSentry() {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.init({
    dsn: getSentryDsn(),
    environment: app.isPackaged ? 'production' : 'development',
    release: `pinnacle@${app.getVersion()}`,
    enableLogs: true,
  });

  setErrorReporter(
    createSentryErrorReporter(
      (error, context) => Sentry.captureException(error, context),
      (message, context) => Sentry.captureMessage(message, context),
    ),
  );
}
