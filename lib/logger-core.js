const LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function resolveMinLevel(options = {}) {
  if (options.minLevel) {
    return options.minLevel;
  }

  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

export function createLogger(scope = 'app', options = {}) {
  const minLevel = resolveMinLevel(options);

  function shouldLog(level) {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
  }

  function formatPrefix(level) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${scope}]`;
  }

  function writeLog(level, message, args = []) {
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
        break;
    }
  }

  return {
    debug: (message, ...args) => writeLog('debug', message, args),
    info: (message, ...args) => writeLog('info', message, args),
    warn: (message, ...args) => writeLog('warn', message, args),
    error: (message, ...args) => writeLog('error', message, args),
  };
}
