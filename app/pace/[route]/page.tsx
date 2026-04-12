import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPaceRoutes, getPaceRoute, getPaceRouteStops } from '@lib/pace'
import PageHeader from '@components/PageHeader'
import PaceRouteChip from '@components/PaceRouteChip'
import { siteConfig } from '@lib/siteConfig'

type Props = { params: Promise<{ route: string }> }

export async function generateStaticParams() {
  const routes = await getAllPaceRoutes()
  return routes.map((r) => ({ route: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route: slug } = await params
  const route = await getPaceRoute(slug)
  if (!route) return {}
  const title = `Route ${route.shortName} — ${route.longName}`
  const description = route.description ?? `Pace Route ${route.shortName} — ${route.longName}.`
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/pace/${slug}`,
      images: [siteConfig.ogImage],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [siteConfig.ogImage],
    },
  }
}

export default async function PaceRoutePage({ params }: Props) {
  const { route: slug } = await params
  const route = await getPaceRoute(slug)

  if (!route) {
    return (
      <main>
        <p>Route not found.</p>
      </main>
    )
  }

  const primaryDirection = route.directions[0]
  const stops = primaryDirection ? await getPaceRouteStops(route.slug, primaryDirection.id) : []

  return (
    <main>
      <PageHeader
        title={`Route ${route.shortName}`}
        description={route.description ?? route.longName}
        breadcrumbItems={[{ label: 'Pace', href: '/pace' }, { label: `Route ${route.shortName}` }]}
        badges={
          <>
            <PaceRouteChip
              shortName={route.shortName}
              color={route.color}
              textColor={route.textColor}
            />
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {route.serviceType === 'pulse' ? 'Pulse BRT' : route.serviceType}
            </span>
          </>
        }
      />

      {primaryDirection && (
        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Stops — {primaryDirection.name}
          </h2>
          <ul className="flex flex-col gap-2">
            {stops.map((stop) => (
              <li key={stop.slug}>
                <Link
                  href={`/pace/${route.slug}/${stop.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <span className="w-8 text-center text-xs font-semibold text-gray-400">
                    {stop.sequence}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stop.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
