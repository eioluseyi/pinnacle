import { createLogger } from '@/lib/logger';
import { LoggerContext } from '@/providers/LoggerProvider';
import { useContext, useMemo } from 'react';

export const useLogger = (scope?: string) => {
  const logger = useContext(LoggerContext);

  if (!logger) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }

  return useMemo(() => {
    if (!scope) return logger;
    return createLogger(scope);
  }, [logger, scope]);
};
