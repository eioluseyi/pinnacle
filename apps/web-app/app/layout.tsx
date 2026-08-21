import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { LayoutProvider } from '@/providers/LayoutProvider';
import { cn } from '@/lib/utils';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
      <html lang='en' className={cn(geistSans.variable, geistMono.variable, 'h-full antialiased')}>
        <body className='min-h-full flex flex-col'>{children}</body>
      </html>
    </LayoutProvider>
  );
}
