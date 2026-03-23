import type { Metadata } from 'next'
import Link from 'next/link'
import { getLinesForService } from '../lib/transit'

export const metadata: Metadata = {
  title: 'Metra',
  description: 'Metra commuter rail schedules, routes, and real-time tracking.',
  openGraph: {
    title: 'Metra | Chicago Transit Tracker',
    description: 'Metra commuter rail schedules, routes, and real-time tracking.',
    url: 'https://chicago-transit-tracker.com/metra',
    type: 'website',
  },
}

export default async function MetraPage() {
  const lines = await getLinesForService('metra')

  return (
    <main>
      <h1>Metra Lines</h1>
      <ul>
        {lines.map((line) => (
          <li key={line.id}>
            <Link href={`/metra/${line.slug}`}>
              <span style={{ backgroundColor: line.color, color: line.textColor, padding: '2px 8px', borderRadius: 4, marginRight: 8 }}>
                {line.shortName}
              </span>
              {line.name}
            </Link>
            {' — '}
            {line.termini.join(' → ')}
            {' · '}
            {line.stationCount} stations
            {' · '}
            {line.routeMiles} mi
            {line.downtownTerminal && ` · Terminal: ${line.downtownTerminal}`}
          </li>
        ))}
      </ul>
    </main>
  )
}
