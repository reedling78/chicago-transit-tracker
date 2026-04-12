import type { Metadata } from 'next'
import { getAllPaceRoutes } from '@lib/pace'
import PageHeader from '@components/PageHeader'
import PaceBrowseList from '@components/PaceBrowseList'
import PaceRouteSearch from '@components/PaceRouteSearch'
import { siteConfig } from '@lib/siteConfig'

const description =
  'Explore Pace Suburban Bus — 130+ routes across the Chicago suburbs. Schedules, routes, and stops, including Pulse bus rapid transit.'

export const metadata: Metadata = {
  title: 'Pace Suburban Bus',
  description,
  openGraph: {
    title: `Pace Suburban Bus | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/pace`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Pace Suburban Bus | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
}

export default async function PacePage() {
  const routes = await getAllPaceRoutes()

  return (
    <main>
      <PageHeader
        title="Pace Suburban Bus"
        description="Schedules, routes, and stops for 130+ Pace bus routes across the Chicago suburbs."
        breadcrumbItems={[{ label: 'Pace Suburban Bus' }]}
      />

      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        For Pace service advisories, visit{' '}
        <a
          href="https://www.pacebus.com/service-alerts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
        >
          pacebus.com
        </a>
        .
      </p>

      <PaceRouteSearch routes={routes} />
      <PaceBrowseList routes={routes} />
    </main>
  )
}
