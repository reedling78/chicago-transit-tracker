import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPaceRoutes } from '@lib/pace'
import PageHeader from '@components/PageHeader'
import PaceRouteChip from '@components/PaceRouteChip'
import { siteConfig } from '@lib/siteConfig'

const description =
  'Pulse is Pace Suburban Bus rapid transit — limited-stop service with branded stations, off-board fare payment, and higher-frequency service.'

export const metadata: Metadata = {
  title: 'Pulse — Pace Bus Rapid Transit',
  description,
  openGraph: {
    title: `Pulse | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/pace/pulse`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Pulse | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
}

export default async function PulsePage() {
  const allRoutes = await getAllPaceRoutes()
  const pulseRoutes = allRoutes.filter((r) => r.serviceType === 'pulse')

  return (
    <main>
      <PageHeader
        title="Pulse — Pace Bus Rapid Transit"
        description="Limited-stop service with branded stations, off-board fare payment, and higher-frequency service along Pace's busiest corridors."
        breadcrumbItems={[{ label: 'Pace', href: '/pace' }, { label: 'Pulse' }]}
      />

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          What makes Pulse different
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
          <li>• Branded shelters with real-time arrival information</li>
          <li>• Off-board fare payment for faster boarding</li>
          <li>• Limited-stop service along major corridors</li>
          <li>• Service every 10–15 minutes during peak hours</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Pulse Lines
        </h2>
        <ul className="flex flex-col gap-2">
          {pulseRoutes.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/pace/${r.slug}`}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <PaceRouteChip shortName={r.shortName} color={r.color} textColor={r.textColor} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {r.longName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
