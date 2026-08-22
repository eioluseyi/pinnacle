import type { Metadata } from 'next';
import { Geist_Mono, Instrument_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { LayoutProvider } from '@/providers/LayoutProvider';
import { cn } from '@/lib/utils';

const instrumentSans = Instrument_Sans({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-serif',
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin', 'latin-ext', 'cyrillic'],
});

export const metadata: Metadata = {
  title: 'Pinnacle',
  description: 'Web view addon for your projection software',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LayoutProvider>
      <html
        lang='en'
        className={cn(instrumentSans.variable, instrumentSerif.variable, geistMono.variable, 'h-full antialiased')}>
        <body className='min-h-full flex flex-col'>{children}</body>
      </html>
    </LayoutProvider>
  );
}
