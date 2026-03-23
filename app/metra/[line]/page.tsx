import type { Metadata } from 'next'
import Link from 'next/link'
import { getLinesForService, getLine, getStationsForLine } from '../../lib/transit'

type Props = { params: Promise<{ line: string }> }

export async function generateStaticParams() {
  const lines = await getLinesForService('metra')
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
      url: `https://chicago-transit-tracker.com/metra/${slug}`,
      type: 'website',
    },
  }
}

export default async function MetraLinePage({ params }: Props) {
  const { line: slug } = await params
  const line = await getLine(slug)
  if (!line) return <main><p>Line not found.</p></main>

  const stationList = await getStationsForLine(line.shortName)

  return (
    <main>
      <p><Link href="/metra">← Metra Lines</Link></p>

      <h1>
        <span style={{ backgroundColor: line.color, color: line.textColor, padding: '2px 10px', borderRadius: 4, marginRight: 10 }}>
          {line.shortName}
        </span>
        {line.name}
      </h1>

      <dl>
        <dt>Type</dt>
        <dd>Commuter Rail</dd>

        <dt>Termini</dt>
        <dd>{line.termini.join(' → ')}</dd>

        <dt>Stations</dt>
        <dd>{line.stationCount}</dd>

        <dt>Route Miles</dt>
        <dd>{line.routeMiles}</dd>

        <dt>Description</dt>
        <dd>{line.description}</dd>

        {line.downtownTerminal && (
          <>
            <dt>Downtown Terminal</dt>
            <dd>{line.downtownTerminal}</dd>
          </>
        )}

        {line.operator && (
          <>
            <dt>Operator</dt>
            <dd>{line.operator}</dd>
          </>
        )}

        {line.countiesServed.length > 0 && (
          <>
            <dt>Counties Served</dt>
            <dd>{line.countiesServed.join(', ')}</dd>
          </>
        )}

        {line.metraLineCode && (
          <>
            <dt>Metra Line Code</dt>
            <dd>{line.metraLineCode}</dd>
          </>
        )}
      </dl>

      <h2>Stations ({stationList.length})</h2>
      <ul>
        {stationList.map((station) => (
          <li key={station.id}>
            <Link href={`/metra/${slug}/${station.slug}`}>
              {station.name}
            </Link>
            {station.accessibility.ada && ' ♿'}
          </li>
        ))}
      </ul>
    </main>
  )
}
