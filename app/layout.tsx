import React from 'react';
import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import { Providers } from './providers';
 import { Analytics } from "@vercel/analytics/react"

export const metadata = {
  title: 'zecall.ai',
  description: 'Votre assistant virtuel pour les appels entrants et sortants',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/_next/static/css/app/layout.css"
          as="style"
        />
      </head>
      <body className={`${inter.className} antialiased overscroll-x-auto`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
