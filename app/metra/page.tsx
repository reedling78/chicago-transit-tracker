import type { Metadata } from 'next'
import { getLinesForService } from '../lib/transit'
import LinkCard from '../components/LinkCard'
import PageHeader from '../components/PageHeader'

export const metadata: Metadata = {
  title: 'Metra',
  description: 'Metra commuter rail schedules, routes, and real-time tracking.',
  openGraph: {
    title: 'Metra | Chicago Transit Tracker',
    description: 'Metra commuter rail schedules, routes, and real-time tracking.',
    url: 'https://chicagotransittracker.com/metra',
    type: 'website',
  },
}

export default async function MetraPage() {
  const lines = await getLinesForService('metra')

  return (
    <main>
      <PageHeader title="Metra Lines" description="11 commuter rail lines connecting Chicago to the suburbs across 6 counties." />
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
          />
        ))}
      </div>
    </main>
  )
}
