'use client';

import { useScreenAlwaysOn } from '@/hooks/useScreenAlwaysOn';
import React, { createContext, useContext } from 'react';

const useLayoutContextValue = () => undefined;

export type LayoutContextValue = ReturnType<typeof useLayoutContextValue>;

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export const LayoutProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  useScreenAlwaysOn();
  const value = useLayoutContextValue();
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayout = (): LayoutContextValue => {
  const context = useContext(LayoutContext);

  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }

  return context;
};
