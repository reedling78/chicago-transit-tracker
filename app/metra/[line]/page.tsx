import type { Metadata } from 'next'
import { getLinesForService, getLine, getStationsForLine } from '../../lib/transit'
import Breadcrumb from '../../components/Breadcrumb'
import LineDetail from '../../components/LineDetail'

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
      <Breadcrumb items={[{ label: 'Metra Lines', href: '/metra' }, { label: line.name }]} />

      <LineDetail line={line} stations={stationList} stationHrefPrefix={`/metra/${slug}`} />
    </main>
  )
}
