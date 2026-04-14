// app/layout.tsx
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import './globals.css'
import Navbar from '@components/Navbar'
import Footer from '@components/Footer'
import Analytics from '@components/Analytics'
import { siteConfig } from '@lib/siteConfig'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    template: `%s | ${siteConfig.name}`,
    default: siteConfig.name,
  },
  description: siteConfig.description,
  manifest: '/site.webmanifest',
  alternates: {
    canonical: './',
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before paint — applies saved theme to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            var saved = localStorage.getItem('theme');
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (saved === 'dark' || (!saved && prefersDark)) {
              document.documentElement.classList.add('dark');
            }
          })();
        `,
          }}
        />
      </head>
      <body
        className={`${geist.className} flex min-h-screen flex-col bg-gray-50 transition-colors dark:bg-gray-950`}
      >
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <Footer />
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaId}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${siteConfig.gaId}');
        `}</Script>
      </body>
    </html>
  )
}
