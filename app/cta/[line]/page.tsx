import type { Metadata } from 'next'
import Link from 'next/link'
import { getLinesForService, getLine, getStationsForLine } from '../../lib/transit'

type Props = { params: Promise<{ line: string }> }

export async function generateStaticParams() {
  const lines = await getLinesForService('cta')
  return lines.map((l) => ({ line: l.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line: slug } = await params
  const line = await getLine(slug)
  if (!line) return {}
  return {
    title: line.name,
    description: line.description,
    openGraph: {
      title: `${line.name} | Chicago Transit Tracker`,
      description: line.description,
      url: `https://chicago-transit-tracker.com/cta/${slug}`,
      type: 'website',
    },
  }
}

export default async function CTALinePage({ params }: Props) {
  const { line: slug } = await params
  const line = await getLine(slug)
  if (!line) return <main><p>Line not found.</p></main>

  const stationList = await getStationsForLine(line.shortName)

  return (
    <main>
      <p><Link href="/cta">← CTA Lines</Link></p>

      <h1>
        <span style={{ backgroundColor: line.color, color: line.textColor, padding: '2px 10px', borderRadius: 4, marginRight: 10 }}>
          {line.shortName}
        </span>
        {line.name}
      </h1>

      <dl>
        <dt>Type</dt>
        <dd>{line.type === 'rapid_transit' ? 'Rapid Transit' : 'Commuter Rail'}</dd>

        <dt>Termini</dt>
        <dd>{line.termini.join(' → ')}</dd>

        <dt>Stations</dt>
        <dd>{line.stationCount}</dd>

        <dt>Route Miles</dt>
        <dd>{line.routeMiles}</dd>

        <dt>Description</dt>
        <dd>{line.description}</dd>

        <dt>24-Hour Service</dt>
        <dd>{line.operatesOvernight ? 'Yes' : 'No'}</dd>

        {line.peakFrequencyMins && (
          <>
            <dt>Peak Frequency</dt>
            <dd>Every {line.peakFrequencyMins} min</dd>
          </>
        )}

        {line.offPeakFrequencyMins && (
          <>
            <dt>Off-Peak Frequency</dt>
            <dd>Every {line.offPeakFrequencyMins} min</dd>
          </>
        )}

        {line.firstTrainApprox && (
          <>
            <dt>First Train (approx)</dt>
            <dd>{line.firstTrainApprox}</dd>
          </>
        )}

        {line.lastTrainApprox && (
          <>
            <dt>Last Train (approx)</dt>
            <dd>{line.lastTrainApprox}</dd>
          </>
        )}

        {line.ctaRouteId && (
          <>
            <dt>CTA Route ID</dt>
            <dd>{line.ctaRouteId}</dd>
          </>
        )}
      </dl>

      <h2>Stations ({stationList.length})</h2>
      <ul>
        {stationList.map((station) => (
          <li key={station.id}>
            <Link href={`/cta/${slug}/${station.slug}`}>
              {station.name}
            </Link>
            {station.accessibility.ada && ' ♿'}
          </li>
        ))}
      </ul>
    </main>
  )
}
