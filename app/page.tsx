// app/page.tsx
import type { Metadata } from 'next'
import { siteConfig } from './lib/siteConfig'

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

import Hero from './components/Hero'

export default function HomePage() {
  return (
    <div>
      <Hero />
    </div>
  )
}
