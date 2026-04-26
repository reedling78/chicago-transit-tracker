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

import Dashboard from '@components/dashboard/Dashboard'
import MetraAlerts from '@components/MetraAlerts'

export default function HomePage() {
  return (
    <div>
      <Dashboard />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <MetraAlerts />
      </section>
    </div>
  )
}
