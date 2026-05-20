import type { DashboardItem, Line, Station } from '@ctt/shared'

/**
 * Resolve the deep-link route for a dashboard item. Returns null if the item
 * cannot be resolved against the provided lines/stations (data still loading
 * or stale entry pointing at deleted content).
 */
export function dashboardItemRoute(
  item: DashboardItem,
  lines: Line[] | undefined,
  stations: Station[] | undefined,
): string | null {
  if (item.type === 'line') {
    const line = (lines ?? []).find((l) => l.slug === item.id)
    return line ? `/${line.service}/${line.slug}` : null
  }

  if (item.type === 'station') {
    const station = (stations ?? []).find((s) => s.slug === item.id)
    if (!station) return null
    const firstLineShort = station.lines[0]
    const line = firstLineShort
      ? (lines ?? []).find((l) => l.shortName === firstLineShort)
      : undefined
    if (line) return `/${line.service}/${line.slug}/${station.slug}`
    return `/${station.service === 'metra' ? 'metra' : 'cta'}`
  }

  const [lineSlug, trainNumber] = item.id.split('_')
  if (!lineSlug || !trainNumber) return null
  return `/metra/${lineSlug}/train/${trainNumber}`
}
