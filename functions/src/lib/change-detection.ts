/**
 * Change detection for CTA and Metra GTFS static feeds.
 *
 * Metra: compare published.txt timestamp against stored value.
 * CTA:   compare Last-Modified / ETag headers via HEAD request.
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { fetchText, headRequest } from './gtfs-utils'

const CTA_GTFS_URL = 'https://www.transitchicago.com/downloads/sch_data/google_transit.zip'
const METRA_PUBLISHED_URL = 'https://schedules.metrarail.com/gtfs/published.txt'
const PACE_GTFS_URL = 'https://www.pacebus.com/gtfsdownload'

export interface GtfsMeta {
  lastModified?: string
  etag?: string
  publishedTimestamp?: string
  lastCheckedAt: Timestamp
  lastSyncedAt?: Timestamp
}

/**
 * Check whether the CTA GTFS feed has changed since the last sync.
 * Returns true if the feed has been updated (or if we have no previous record).
 */
export async function hasCtaFeedChanged(): Promise<{
  changed: boolean
  lastModified?: string
  etag?: string
}> {
  const db = getFirestore()
  const metaRef = db.collection('gtfs-meta').doc('cta')
  const metaSnap = await metaRef.get()
  const stored = metaSnap.data() as GtfsMeta | undefined

  const headers = await headRequest(CTA_GTFS_URL)
  const lastModified = headers['last-modified']
  const etag = headers['etag']

  // Update lastCheckedAt regardless
  await metaRef.set({ lastCheckedAt: Timestamp.now() }, { merge: true })

  if (!stored) {
    return { changed: true, lastModified, etag }
  }

  const changed =
    (lastModified !== undefined && lastModified !== stored.lastModified) ||
    (etag !== undefined && etag !== stored.etag)

  return { changed, lastModified, etag }
}

/**
 * Check whether the Metra GTFS feed has changed since the last sync.
 * Uses the published.txt timestamp file for efficient detection.
 */
export async function hasMetraFeedChanged(): Promise<{
  changed: boolean
  publishedTimestamp: string
}> {
  const db = getFirestore()
  const metaRef = db.collection('gtfs-meta').doc('metra')
  const metaSnap = await metaRef.get()
  const stored = metaSnap.data() as GtfsMeta | undefined

  const publishedTimestamp = await fetchText(METRA_PUBLISHED_URL)

  // Update lastCheckedAt regardless
  await metaRef.set({ lastCheckedAt: Timestamp.now() }, { merge: true })

  if (!stored) {
    return { changed: true, publishedTimestamp }
  }

  const changed = publishedTimestamp !== stored.publishedTimestamp

  return { changed, publishedTimestamp }
}

/** Update the stored metadata after a successful CTA sync. */
export async function updateCtaMeta(lastModified?: string, etag?: string): Promise<void> {
  const db = getFirestore()
  await db
    .collection('gtfs-meta')
    .doc('cta')
    .set(
      {
        lastModified: lastModified ?? null,
        etag: etag ?? null,
        lastSyncedAt: Timestamp.now(),
        lastCheckedAt: Timestamp.now(),
      },
      { merge: true },
    )
}

/** Update the stored metadata after a successful Metra sync. */
export async function updateMetraMeta(publishedTimestamp: string): Promise<void> {
  const db = getFirestore()
  await db.collection('gtfs-meta').doc('metra').set(
    {
      publishedTimestamp,
      lastSyncedAt: Timestamp.now(),
      lastCheckedAt: Timestamp.now(),
    },
    { merge: true },
  )
}

/**
 * Check whether the Pace GTFS feed has changed since the last sync.
 * Uses Last-Modified / ETag headers via HEAD request, same strategy as CTA.
 */
export async function hasPaceFeedChanged(): Promise<{
  changed: boolean
  lastModified?: string
  etag?: string
}> {
  const db = getFirestore()
  const metaRef = db.collection('gtfs-meta').doc('pace')
  const metaSnap = await metaRef.get()
  const stored = metaSnap.data() as GtfsMeta | undefined

  const headers = await headRequest(PACE_GTFS_URL)
  const lastModified = headers['last-modified']
  const etag = headers['etag']

  await metaRef.set({ lastCheckedAt: Timestamp.now() }, { merge: true })

  if (!stored) {
    return { changed: true, lastModified, etag }
  }

  const changed =
    (lastModified !== undefined && lastModified !== stored.lastModified) ||
    (etag !== undefined && etag !== stored.etag)

  return { changed, lastModified, etag }
}

/** Update the stored metadata after a successful Pace sync. */
export async function updatePaceMeta(lastModified?: string, etag?: string): Promise<void> {
  const db = getFirestore()
  await db
    .collection('gtfs-meta')
    .doc('pace')
    .set(
      {
        lastModified: lastModified ?? null,
        etag: etag ?? null,
        lastSyncedAt: Timestamp.now(),
        lastCheckedAt: Timestamp.now(),
      },
      { merge: true },
    )
}
