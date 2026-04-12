import Link from 'next/link'
import type { PaceRoute, PaceRegion } from '@lib/pace-types'
import PaceRouteChip from './PaceRouteChip'

interface Props {
  routes: PaceRoute[]
}

const REGION_ORDER: PaceRegion[] = ['north', 'northwest', 'west', 'southwest', 'south', 'heritage']

const REGION_LABELS: Record<PaceRegion, string> = {
  north: 'North',
  northwest: 'Northwest',
  west: 'West',
  southwest: 'Southwest',
  south: 'South',
  heritage: 'Heritage Corridor',
}

function RouteItem({ route }: { route: PaceRoute }) {
  return (
    <li>
      <Link
        href={`/pace/${route.slug}`}
        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <PaceRouteChip
          shortName={route.shortName}
          color={route.color}
          textColor={route.textColor}
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white">{route.longName}</span>
      </Link>
    </li>
  )
}

export default function PaceBrowseList({ routes }: Props) {
  const pulse = routes.filter((r) => r.serviceType === 'pulse')
  const byRegion = new Map<PaceRegion, PaceRoute[]>()
  for (const r of routes) {
    if (r.serviceType === 'pulse') continue
    const list = byRegion.get(r.region) ?? []
    list.push(r)
    byRegion.set(r.region, list)
  }

  return (
    <div className="flex flex-col gap-10">
      {pulse.length > 0 && (
        <section aria-labelledby="pulse-heading">
          <h2
            id="pulse-heading"
            className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500"
          >
            Pulse — Bus Rapid Transit
          </h2>
          <ul className="flex flex-col gap-2">
            {pulse.map((r) => (
              <RouteItem key={r.slug} route={r} />
            ))}
          </ul>
        </section>
      )}

      {REGION_ORDER.map((region) => {
        const list = byRegion.get(region)
        if (!list || list.length === 0) return null
        return (
          <section key={region} aria-labelledby={`region-${region}-heading`}>
            <h2
              id={`region-${region}-heading`}
              className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500"
            >
              {REGION_LABELS[region]}
            </h2>
            <ul className="flex flex-col gap-2">
              {list.map((r) => (
                <RouteItem key={r.slug} route={r} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
