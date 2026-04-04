import type { Metadata } from 'next'
import { getLinesForService, getLine, getStationsForLine } from '../../lib/transit'
import Link from 'next/link'
import Breadcrumb from '../../components/Breadcrumb'
import CTALineIcon from '../../components/CTALineIcon'
import CTAAlerts from '../../components/CTAAlerts'
import LineDetail from '../../components/LineDetail'
import PageHeader from '../../components/PageHeader'
import StationList from '../../components/StationList'
import { siteConfig } from '../../lib/siteConfig'

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
      title: `${line.name} | ${siteConfig.name}`,
      description: line.description,
      url: `${siteConfig.url}/cta/${slug}`,
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

export default async function CTALinePage({ params }: Props) {
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
      <Breadcrumb items={[{ label: 'CTA Lines', href: '/cta' }, { label: line.name }]} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PageHeader
            title={line.name}
            description={line.description}
            badges={
              <>
                <CTALineIcon line={line.shortName} size={40} />
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Rapid Transit
                </span>
                {line.operatesOvernight && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    24 Hours
                  </span>
                )}
                {line.scheduleUrl && (
                  <Link
                    href={line.scheduleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="h-3 w-3"
                      aria-hidden="true"
                    >
                      <path d="M8 1a.75.75 0 0 1 .75.75v6.19l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.03a.75.75 0 0 1 1.06-1.06L7.25 7.94V1.75A.75.75 0 0 1 8 1ZM2.5 13.25a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Z" />
                    </svg>
                    Schedule PDF
                  </Link>
                )}
              </>
            }
          />
          <LineDetail line={line} />
          <CTAAlerts line={line} hideChips />
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
