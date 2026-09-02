import { app } from 'electron/main';
import { createLogger } from '@pinnacle/utils';

export function createAppLogger() {
  return createLogger('main', {
    minLevel: process.env.LOG_LEVEL ?? (app.isPackaged ? 'info' : 'debug'),
  });
}

const logger = createAppLogger();

export function logError(context: string, error?: unknown, extra = {}) {
  const err = error instanceof Error ? error : new Error(String(error));

  if (logger) {
    logger.error(context, err, extra);
    return;
  }

  console.error(`[${context}]`, err, extra);
}

export function bindProcessGuards() {
  try {
    process.on('uncaughtException', (error) => {
      logError('Uncaught exception', error);
    });

    process.on('unhandledRejection', (reason) => {
      logError('Unhandled rejection', reason);
    });
  } catch (err) {
    logError('Process guard setup failure', err);
  }
}

export { logger };
