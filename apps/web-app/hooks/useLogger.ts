import { createLogger } from '@pinnacle/utils';
import { useMemo } from 'react';

export const useLogger = (scope = 'app') => {
  return useMemo(() => createLogger(scope), [scope]);
};
