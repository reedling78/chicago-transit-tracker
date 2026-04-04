import type { Metadata } from 'next'
import { getLinesForService } from '../lib/transit'
import LinkCard from '../components/LinkCard'
import PageHeader from '../components/PageHeader'
import { siteConfig } from '../lib/siteConfig'
import MetraAlerts from '../components/MetraAlerts'

const description = 'Metra commuter rail schedules, routes, and real-time tracking.'

export const metadata: Metadata = {
  title: 'Metra',
  description,
  openGraph: {
    title: `Metra | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/metra`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Metra | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
}

export default async function MetraPage() {
  const lines = await getLinesForService('metra')

  return (
    <main>
      <PageHeader
        title="Metra Lines"
        description="11 commuter rail lines connecting Chicago to the suburbs across 6 counties."
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            11 Metra Lines
          </h2>
          <div className="flex flex-col gap-3">
            {lines.map((line) => (
              <LinkCard
                key={line.id}
                href={`/metra/${line.slug}`}
                title={line.name}
                subtitle={line.termini.join(' → ')}
                meta={`${line.stationCount} stations · ${line.routeMiles} mi`}
                badge={line.shortName}
                badgeColor={line.color}
                badgeTextColor={line.textColor}
                accentColor={line.color}
              />
            ))}
          </div>
        </div>
        <div>
          <MetraAlerts />
        </div>
      </div>
    </main>
  )
}
