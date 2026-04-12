// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { getLinesForService, getStationsForLine } from '@lib/transit'
import { getAllPaceRoutes, getAllPaceStops } from '@lib/pace'
import { getFirestore } from '@lib/firebase-admin'

export const dynamic = 'force-static'

const baseUrl = 'https://chicagotransittracker.com'

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

  const [paceRoutes, paceStops] = await Promise.all([getAllPaceRoutes(), getAllPaceStops()])

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
    {
      url: `${baseUrl}/cta/alerts`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.7,
    },
    { url: `${baseUrl}/metra`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    {
      url: `${baseUrl}/metra/alerts`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.7,
    },
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
    {
      url: `${baseUrl}/pace`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pace/pulse`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    ...paceRoutes.map((r) => ({
      url: `${baseUrl}/pace/${r.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...paceRoutes.flatMap((r) =>
      paceStops
        .filter((s) => s.routes.includes(r.slug))
        .map((s) => ({
          url: `${baseUrl}/pace/${r.slug}/${s.slug}`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        })),
    ),
    ...(
      await Promise.all(
        metraLines.map(async (line) => {
          const db = getFirestore()
          const doc = await db.collection('metra-trip-indexes').doc(line.slug).get()
          if (!doc.exists) return []
          const index = doc.data() as TripIndex
          const allTrips = [...index.weekday, ...index.saturday, ...index.sunday]
          return allTrips.map((t) => ({
            url: `${baseUrl}/metra/${line.slug}/train/${t.tripId}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
          }))
        }),
      )
    ).flat(),
  ]
}
