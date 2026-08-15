'use client';

import { createLogger, type Logger } from '@/lib/logger';
import React, { createContext, useMemo } from 'react';

export const LoggerContext = createContext<Logger | undefined>(undefined);

export const LoggerProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const logger = useMemo(() => createLogger('app'), []);

  return <LoggerContext.Provider value={logger}>{children}</LoggerContext.Provider>;
};
