import { captureException, captureMessage } from '@sentry/electron/main';

type CaptureException = typeof captureException;
type CaptureMessage = typeof captureMessage;
type ErrorReporter = (scope: string, message: string, args: unknown[]) => void;

let errorReporter: ErrorReporter | null = null;
const pendingReports: { scope: string; message: string; args: unknown[] }[] = [];

export function setErrorReporter(reporter: ErrorReporter) {
  errorReporter = reporter;

  if (reporter) {
    while (pendingReports.length) {
      const pending = pendingReports.shift();
      if (!pending) continue;
      reporter(pending.scope, pending.message, pending.args);
    }
  }
}

export function reportError(scope: string, message: string, args: unknown[] = []) {
  if (errorReporter) {
    errorReporter(scope, message, args);
    return;
  }

  pendingReports.push({ scope, message, args });
}

function formatLoggerMessage(message: string, args: unknown[]) {
  if (!args.length) {
    return message;
  }

  const serializedArgs = args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.message;
      }

      if (typeof arg === 'string') {
        return arg;
      }

      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');

  return `${message} ${serializedArgs}`.trim();
}

export function createSentryErrorReporter(captureException: CaptureException, captureMessage: CaptureMessage) {
  return (scope: string, message: string, args: unknown[] = []) => {
    const error = args.find((arg) => arg instanceof Error);

    if (error) {
      captureException(error, {
        tags: { 'logger.scope': scope },
        extra: { message },
      });
      return;
    }

    captureMessage(formatLoggerMessage(message, args), {
      level: 'error',
      tags: { 'logger.scope': scope },
    });
  };
}
