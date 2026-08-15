let errorReporter = null;
const pendingReports = [];

export function setErrorReporter(reporter) {
  errorReporter = reporter;

  if (reporter) {
    while (pendingReports.length) {
      const pending = pendingReports.shift();
      reporter(pending.scope, pending.message, pending.args);
    }
  }
}

export function reportError(scope, message, args = []) {
  if (errorReporter) {
    errorReporter(scope, message, args);
    return;
  }

  pendingReports.push({ scope, message, args });
}

function formatLoggerMessage(message, args) {
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

export function createSentryErrorReporter(captureException, captureMessage) {
  return (scope, message, args = []) => {
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
