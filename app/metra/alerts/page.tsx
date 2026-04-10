import type { Metadata } from 'next'
import PageHeader from '@components/PageHeader'
import MetraAlerts from '@components/MetraAlerts'
import { siteConfig } from '@lib/siteConfig'

const description = 'Real-time Metra commuter rail service alerts and advisories.'

export const metadata: Metadata = {
  title: 'Metra Alerts',
  description,
  openGraph: {
    title: `Metra Alerts | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/metra/alerts`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Metra Alerts | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
}

export default function MetraAlertsPage() {
  return (
    <main>
      <PageHeader
        title="Metra Service Alerts"
        description="Real-time commuter rail service alerts and advisories from Metra."
        imageSrc="/hero-header-metra.jpg"
      />
      <MetraAlerts />
    </main>
  )
}
