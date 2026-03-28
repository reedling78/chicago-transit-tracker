// app/layout.tsx
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import './globals.css'
import Navbar from './components/Navbar'
import Analytics from './components/Analytics'

const GA_ID = 'G-KQ1MNGBQP2'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://chicagotransittracker.com'),
  title: {
    template: '%s | Chicago Transit Tracker',
    default: 'Chicago Transit Tracker',
  },
  description: 'Track Chicago-area transit in real time.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Chicago Transit Tracker',
    description: 'Track Chicago-area transit in real time.',
    url: 'https://chicagotransittracker.com',
    siteName: 'Chicago Transit Tracker',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Chicago Transit Tracker logo and wordmark',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chicago Transit Tracker',
    description: 'Track Chicago-area transit in real time.',
    images: ['/social-preview.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before paint — applies saved theme to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var saved = localStorage.getItem('theme');
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (saved === 'dark' || (!saved && prefersDark)) {
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body className={`${geist.className} bg-gray-50 dark:bg-gray-950 min-h-screen transition-colors`}>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <footer />
        <Suspense fallback={null}><Analytics /></Suspense>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}</Script>
      </body>
    </html>
  )
}
