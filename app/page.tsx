// app/page.tsx
import type { Metadata } from 'next'
import { siteConfig } from '@lib/siteConfig'

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
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

import Hero from '@components/Hero'
import MetraAlerts from '@components/MetraAlerts'
// import MetraPositions from '@components/MetraPositions'
// import MetraTripUpdates from '@components/MetraTripUpdates'

export default function HomePage() {
  return (
    <div>
      <Hero />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <MetraAlerts />
      </section>

      {/* <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Metra Realtime Feeds (Debug)
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <MetraPositions />
          <MetraTripUpdates />
        </div>
      </section> */}
    </div>
  )
}
