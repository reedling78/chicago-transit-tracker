import type { Metadata } from 'next'
import PageHeader from '@components/PageHeader'
import CTAAlerts from '@components/CTAAlerts'
import { siteConfig } from '@lib/siteConfig'

const description = 'Real-time CTA rail service alerts and advisories.'

export const metadata: Metadata = {
  title: 'CTA Alerts',
  description,
  openGraph: {
    title: `CTA Alerts | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/cta/alerts`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `CTA Alerts | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
}

export default function CTAAlertsPage() {
  return (
    <main>
      <PageHeader
        title="CTA Service Alerts"
        description="Real-time rail service alerts and advisories from the CTA."
      />
      <CTAAlerts />
    </main>
  )
}
