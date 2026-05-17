import type { Metadata } from 'next'
import Link from 'next/link'
import { displayStationName } from '@ctt/shared'
import PageHeader from '@components/PageHeader'
import { siteConfig } from '@lib/siteConfig'
import { getLinesForService, getStationsForLine } from '@lib/transit'
import { getAllPaceRoutes } from '@lib/pace'

const description =
  'Full directory of every page on Chicago Transit Tracker — CTA rail lines and stations, Metra lines and stations, and Pace bus routes.'

export const metadata: Metadata = {
  title: 'Site Map',
  description,
  openGraph: {
    title: `Site Map | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/sitemap`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Site Map | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
  alternates: {
    canonical: `${siteConfig.url}/sitemap`,
  },
}

const TOP_LEVEL_LINKS: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Home' },
  { href: '/cta', label: 'CTA Rail' },
  { href: '/cta/alerts', label: 'CTA Alerts' },
  { href: '/metra', label: 'Metra' },
  { href: '/metra/alerts', label: 'Metra Alerts' },
  { href: '/pace', label: 'Pace Bus' },
  { href: '/pace/pulse', label: 'Pace Pulse' },
  { href: '/terms', label: 'Terms of Use' },
  { href: '/privacy', label: 'Privacy' },
]

export default async function SitemapPage() {
  const [ctaLines, metraLines, paceRoutes] = await Promise.all([
    getLinesForService('cta'),
    getLinesForService('metra'),
    getAllPaceRoutes(),
  ])

  const ctaLinesWithStations = await Promise.all(
    ctaLines.map(async (line) => ({
      line,
      stations: await getStationsForLine(line.shortName),
    })),
  )

  const metraLinesWithStations = await Promise.all(
    metraLines.map(async (line) => ({
      line,
      stations: await getStationsForLine(line.shortName),
    })),
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Site Map"
        description="Every page on Chicago Transit Tracker, organized by service."
        breadcrumbItems={[{ label: 'Home', href: '/' }, { label: 'Site Map' }]}
      />

      <section className="mb-12" aria-labelledby="sitemap-pages-heading">
        <h2
          id="sitemap-pages-heading"
          className="mb-4 text-2xl font-bold text-gray-900 dark:text-white"
        >
          Pages
        </h2>
        <ul className="columns-2 gap-6 md:columns-3">
          {TOP_LEVEL_LINKS.map((link) => (
            <li key={link.href} className="mb-2 break-inside-avoid">
              <Link
                href={link.href}
                className="text-sm text-blue-700 hover:underline dark:text-blue-400"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">CTA Rail</h2>
        {ctaLinesWithStations.map(({ line, stations }) => (
          <div key={line.slug} className="mb-8">
            <h3
              className="mb-3 border-l-4 pl-3 text-lg font-semibold text-gray-900 dark:text-white"
              style={{ borderLeftColor: line.color }}
            >
              <Link href={`/cta/${line.slug}`} className="hover:underline">
                {line.name}
              </Link>
            </h3>
            <ul className="columns-2 gap-6 md:columns-3">
              {stations.map((station) => (
                <li key={station.slug} className="mb-2 break-inside-avoid">
                  <Link
                    href={`/cta/${line.slug}/${station.slug}`}
                    className="text-sm text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {displayStationName(station.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Metra</h2>
        {metraLinesWithStations.map(({ line, stations }) => (
          <div key={line.slug} className="mb-8">
            <h3
              className="mb-3 border-l-4 pl-3 text-lg font-semibold text-gray-900 dark:text-white"
              style={{ borderLeftColor: line.color }}
            >
              <Link href={`/metra/${line.slug}`} className="hover:underline">
                {line.name}
              </Link>
            </h3>
            <ul className="columns-2 gap-6 md:columns-3">
              {stations.map((station) => (
                <li key={station.slug} className="mb-2 break-inside-avoid">
                  <Link
                    href={`/metra/${line.slug}/${station.slug}`}
                    className="text-sm text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {displayStationName(station.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Pace Bus</h2>
        <ul className="columns-2 gap-6 md:columns-3">
          {paceRoutes.map((route) => (
            <li key={route.slug} className="mb-2 break-inside-avoid">
              <Link
                href={`/pace/${route.slug}`}
                className="text-sm text-blue-700 hover:underline dark:text-blue-400"
              >
                {route.shortName} — {route.longName}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
