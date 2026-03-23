import type { Metadata } from 'next'
import Link from 'next/link'
import { getLinesForService } from '../lib/transit'

export const metadata: Metadata = {
  title: 'CTA',
  description: 'CTA bus and rail schedules, routes, and real-time tracking.',
  openGraph: {
    title: 'CTA | Chicago Transit Tracker',
    description: 'CTA bus and rail schedules, routes, and real-time tracking.',
    url: 'https://chicago-transit-tracker.com/cta',
    type: 'website',
  },
}

export default async function CTAPage() {
  const lines = await getLinesForService('cta')

  return (
    <main>
      <h1>CTA Lines</h1>
      <ul>
        {lines.map((line) => (
          <li key={line.id}>
            <Link href={`/cta/${line.slug}`}>
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
          </li>
        ))}
      </ul>
    </main>
  )
}
