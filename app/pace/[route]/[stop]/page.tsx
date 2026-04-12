import type { Metadata } from 'next'
import { getAllPaceRoutes, getAllPaceStops, getPaceRoute, getPaceStop } from '@lib/pace'
import PageHeader from '@components/PageHeader'
import PaceRouteChip from '@components/PaceRouteChip'
import PaceScheduleTable from '@components/PaceScheduleTable'
import { siteConfig } from '@lib/siteConfig'

type Props = { params: Promise<{ route: string; stop: string }> }

export async function generateStaticParams() {
  const routes = await getAllPaceRoutes()
  const stops = await getAllPaceStops()
  const params: { route: string; stop: string }[] = []
  for (const route of routes) {
    for (const stop of stops) {
      if (stop.routes.includes(route.slug)) {
        params.push({ route: route.slug, stop: stop.slug })
      }
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route: routeSlug, stop: stopSlug } = await params
  const [route, stop] = await Promise.all([getPaceRoute(routeSlug), getPaceStop(stopSlug)])
  if (!route || !stop) return {}
  const title = `${stop.name} — Route ${route.shortName}`
  const description = `Schedule and route information for ${stop.name} on Pace Route ${route.shortName}.`
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/pace/${routeSlug}/${stopSlug}`,
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

export default async function PaceStopPage({ params }: Props) {
  const { route: routeSlug, stop: stopSlug } = await params
  const [route, stop] = await Promise.all([getPaceRoute(routeSlug), getPaceStop(stopSlug)])

  if (!route || !stop) {
    return (
      <main>
        <p>Stop not found.</p>
      </main>
    )
  }

  return (
    <main>
      <PageHeader
        title={stop.name}
        description={`Routes and schedules for ${stop.name}.`}
        breadcrumbItems={[
          { label: 'Pace', href: '/pace' },
          { label: `Route ${route.shortName}`, href: `/pace/${route.slug}` },
          { label: stop.name },
        ]}
        badges={
          <div className="flex flex-wrap gap-2">
            {stop.routes.map((r) => (
              <PaceRouteChip
                key={r}
                shortName={r}
                color={r === route.slug ? route.color : '#005DAA'}
                textColor="#FFFFFF"
                href={`/pace/${r}/${stop.slug}`}
              />
            ))}
          </div>
        }
      />

      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Schedule — Route {route.shortName}
        </h2>
        <PaceScheduleTable
          stopSlug={stop.slug}
          routeSlug={route.slug}
          directions={route.directions}
        />
      </section>
    </main>
  )
}
