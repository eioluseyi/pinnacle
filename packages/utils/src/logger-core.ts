import { reportError } from './sentry-report';

const LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

type Level = keyof typeof LEVEL_PRIORITY;

function resolveMinLevel(options: { minLevel?: Level } = {}) {
  if (options.minLevel) {
    return options.minLevel;
  }

  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL as Level;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

export function createLogger(scope = 'app', options = {}) {
  const minLevel = resolveMinLevel(options);

  function shouldLog(level: Level) {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
  }

  function formatPrefix(level: Level) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${scope}]`;
  }

  function writeLog(level: Level, message: string, args: unknown[] = []) {
    if (!shouldLog(level)) {
      return;
    }

    const prefix = formatPrefix(level);
    const output = args.length ? [prefix, message, ...args] : [prefix, message];

    switch (level) {
      case 'debug':
        console.debug(...output);
        break;
      case 'info':
        console.info(...output);
        break;
      case 'warn':
        console.warn(...output);
        break;
      case 'error':
        console.error(...output);
        reportError(scope, message, args);
        break;
    }
  }

  return {
    debug: (message: string, ...args: unknown[]) => writeLog('debug', message, args),
    info: (message: string, ...args: unknown[]) => writeLog('info', message, args),
    warn: (message: string, ...args: unknown[]) => writeLog('warn', message, args),
    error: (message: string, ...args: unknown[]) => writeLog('error', message, args),
  };
}
