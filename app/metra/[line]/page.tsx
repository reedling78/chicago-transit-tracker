import type { Metadata } from 'next'
import { getLinesForService, getLine, getStationsForLine } from '../../lib/transit'
import Breadcrumb from '../../components/Breadcrumb'
import LineDetail from '../../components/LineDetail'
import StationList from '../../components/StationList'
import { siteConfig } from '../../lib/siteConfig'

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
      title: `${line.name} | ${siteConfig.name}`,
      description: line.description,
      url: `${siteConfig.url}/metra/${slug}`,
      images: [siteConfig.ogImage],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${line.name} | ${siteConfig.name}`,
      description: line.description,
      images: [siteConfig.ogImage],
    },
  }
}

export default async function MetraLinePage({ params }: Props) {
  const { line: slug } = await params
  const line = await getLine(slug)
  if (!line)
    return (
      <main>
        <p>Line not found.</p>
      </main>
    )

  const stationList = await getStationsForLine(line.shortName)

  return (
    <main>
      <Breadcrumb items={[{ label: 'Metra Lines', href: '/metra' }, { label: line.name }]} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LineDetail line={line} />
        </div>
        <div className="lg:col-span-1">
          <StationList
            stations={stationList}
            lineColor={line.color}
            stationHrefPrefix={`/metra/${slug}`}
            currentLine={line.shortName}
          />
        </div>
      </div>
    </main>
  )
}
