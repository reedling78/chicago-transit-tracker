import type { Favorite, Line, Station } from '@ctt/shared'

/**
 * Resolve the deep-link route for a favorite. Returns null if the favorite
 * cannot be resolved against the provided lines/stations (data still loading
 * or stale entry pointing at deleted content).
 */
export function favoriteRoute(
  favorite: Favorite,
  lines: Line[] | undefined,
  stations: Station[] | undefined,
): string | null {
  if (favorite.type === 'line') {
    const line = (lines ?? []).find((l) => l.slug === favorite.id)
    return line ? `/${line.service}/${line.slug}` : null
  }

  if (favorite.type === 'station') {
    const station = (stations ?? []).find((s) => s.slug === favorite.id)
    if (!station) return null
    const firstLineShort = station.lines[0]
    const line = firstLineShort
      ? (lines ?? []).find((l) => l.shortName === firstLineShort)
      : undefined
    if (line) return `/${line.service}/station/${station.slug}`
    return `/${station.service === 'metra' ? 'metra' : 'cta'}`
  }

  // train: id is `${lineSlug}_${trainNumber}`
  const [lineSlug, trainNumber] = favorite.id.split('_')
  if (!lineSlug || !trainNumber) return null
  return `/metra/${lineSlug}/train/${trainNumber}`
}
