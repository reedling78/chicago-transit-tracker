// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { getLinesForService, getStationsForLine } from './lib/transit'

export const dynamic = 'force-static'

const baseUrl = 'https://chicago-transit-tracker.com'
const TRIP_INDEX_DIR = path.join(process.cwd(), 'public', 'data', 'metra-trip-index')

interface TripIndexEntry {
  tripId: string
}
interface TripIndex {
  weekday: TripIndexEntry[]
  saturday: TripIndexEntry[]
  sunday: TripIndexEntry[]
}

// STANDING RULE: Add every new page to this array when it is created.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ctaLines, metraLines] = await Promise.all([
    getLinesForService('cta'),
    getLinesForService('metra'),
  ])

  const ctaStationEntries = (
    await Promise.all(
      ctaLines.map(async (line) => {
        const stations = await getStationsForLine(line.shortName)
        return stations.map((s) => ({
          url: `${baseUrl}/cta/${line.slug}/${s.slug}`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }))
      }),
    )
  ).flat()

  const metraStationEntries = (
    await Promise.all(
      metraLines.map(async (line) => {
        const stations = await getStationsForLine(line.shortName)
        return stations.map((s) => ({
          url: `${baseUrl}/metra/${line.slug}/${s.slug}`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }))
      }),
    )
  ).flat()

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    { url: `${baseUrl}/cta`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/metra`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...ctaLines.map((l) => ({
      url: `${baseUrl}/cta/${l.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...metraLines.map((l) => ({
      url: `${baseUrl}/metra/${l.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...ctaStationEntries,
    ...metraStationEntries,
    ...metraLines.flatMap((line) => {
      const indexPath = path.join(TRIP_INDEX_DIR, `${line.slug}.json`)
      if (!existsSync(indexPath)) return []
      const index = JSON.parse(readFileSync(indexPath, 'utf8')) as TripIndex
      const allTrips = [...index.weekday, ...index.saturday, ...index.sunday]
      return allTrips.map((t) => ({
        url: `${baseUrl}/metra/${line.slug}/train/${t.tripId}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }))
    }),
  ]
}
