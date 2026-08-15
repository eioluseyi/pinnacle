import { createLogger } from '@/lib/logger';
import { useMemo } from 'react';

export const useLogger = (scope = 'app') => {
  return useMemo(() => createLogger(scope), [scope]);
};
