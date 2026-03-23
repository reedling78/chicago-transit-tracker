import type { Metadata } from 'next'
import { getLinesForService, getLine, getStationsForLine } from '../../lib/transit'
import Breadcrumb from '../../components/Breadcrumb'
import LineDetail from '../../components/LineDetail'
import StationList from '../../components/StationList'

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
      <Breadcrumb items={[{ label: 'CTA Lines', href: '/cta' }, { label: line.name }]} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LineDetail line={line} />
        </div>
        <div className="lg:col-span-1">
          <StationList
            stations={stationList}
            lineColor={line.color}
            stationHrefPrefix={`/cta/${slug}`}
            currentLine={line.shortName}
          />
        </div>
      </div>
    </main>
  )
}
