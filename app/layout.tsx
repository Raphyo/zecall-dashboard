import React from 'react';
import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import { Providers } from './providers';
import { Analytics } from "@vercel/analytics/react"
import { SessionProvider } from 'next-auth/react';

export const metadata = {
  title: 'zecall.ai',
  description: 'Zecall - Votre assistant commercial intelligent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="preload"
          href="/_next/static/css/app/layout.css"
          as="style"
        />
      </head>
      <body className={`${inter.className} antialiased overscroll-x-auto`}>
        <Providers>
          <SessionProvider>
            {children}
          </SessionProvider>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
