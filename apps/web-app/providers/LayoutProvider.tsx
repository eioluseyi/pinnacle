'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { useScreenAlwaysOn } from '@/hooks/useScreenAlwaysOn';
import { useSentryClient } from '@/hooks/useSentryClient';
import React, { createContext, useContext } from 'react';

const useLayoutContextValue = () => undefined;

export type LayoutContextValue = ReturnType<typeof useLayoutContextValue>;

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export const LayoutProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  useScreenAlwaysOn();
  useSentryClient();

  const value = useLayoutContextValue();
  return (
    <LayoutContext.Provider value={value}>
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </LayoutContext.Provider>
  );
};

export const useLayout = (): LayoutContextValue => {
  const context = useContext(LayoutContext);

  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }

  return context;
};
