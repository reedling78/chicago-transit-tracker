/**
 * Cloud Functions for automated GTFS schedule sync.
 *
 * Two scheduled functions check CTA and Metra GTFS feeds hourly for updates.
 * When a feed has changed, the function downloads the new zip, parses it,
 * and writes the results to Firestore collections.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import AdmZip from 'adm-zip'

import { downloadBuffer } from './lib/gtfs-utils'
import {
  hasCtaFeedChanged,
  hasMetraFeedChanged,
  updateCtaMeta,
  updateMetraMeta,
} from './lib/change-detection'
import { batchWrite } from './lib/firestore-writer'
import { parseCtaSchedules } from './lib/parsers/cta-schedules'
import { parseMetraSchedules } from './lib/parsers/metra-schedules'
import { parseMetraTrips } from './lib/parsers/metra-trips'

const CTA_GTFS_URL = 'https://www.transitchicago.com/downloads/sch_data/google_transit.zip'
const METRA_GTFS_URL = 'https://schedules.metrarail.com/gtfs/schedule.zip'

initializeApp()

// ---------------------------------------------------------------------------
// CTA Sync — runs at the top of every hour
// ---------------------------------------------------------------------------

export const syncCtaGtfs = onSchedule(
  {
    schedule: '0 * * * *',
    region: 'us-central1',
    memory: '4GiB',
    timeoutSeconds: 540,
  },
  async () => {
    const { changed, lastModified, etag } = await hasCtaFeedChanged()

    if (!changed) {
      logger.info('CTA GTFS feed unchanged, skipping sync')
      return
    }

    logger.info('CTA GTFS feed changed, starting sync', { lastModified, etag })

    // Load ctaMapId → slug mapping from Firestore
    const db = getFirestore()
    const snap = await db.collection('stations').where('service', '==', 'cta').get()
    const mapIdToSlug = new Map<number, string>()
    for (const doc of snap.docs) {
      const d = doc.data()
      if (d.ctaMapId) mapIdToSlug.set(d.ctaMapId as number, doc.id)
    }
    logger.info(`Loaded ${mapIdToSlug.size} CTA stations from Firestore`)

    // Download and parse
    const buf = await downloadBuffer(CTA_GTFS_URL)
    const zip = new AdmZip(buf)
    logger.info('CTA GTFS downloaded, parsing schedules')

    const schedules = parseCtaSchedules(zip, mapIdToSlug)

    // Write to Firestore
    const docs = new Map<string, Record<string, unknown>>()
    for (const [slug, schedule] of schedules) {
      docs.set(slug, schedule as unknown as Record<string, unknown>)
    }
    const written = await batchWrite('schedules', docs)
    logger.info(`Wrote ${written} CTA schedule documents to Firestore`)

    await updateCtaMeta(lastModified, etag)
    logger.info('CTA sync complete')
  },
)

// ---------------------------------------------------------------------------
// Metra Sync — runs at :05 past every hour
// ---------------------------------------------------------------------------

export const syncMetraGtfs = onSchedule(
  {
    schedule: '5 * * * *',
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const { changed, publishedTimestamp } = await hasMetraFeedChanged()

    if (!changed) {
      logger.info('Metra GTFS feed unchanged, skipping sync')
      return
    }

    logger.info('Metra GTFS feed changed, starting sync', { publishedTimestamp })

    const db = getFirestore()

    // Load Metra station mappings from Firestore
    const stationSnap = await db.collection('stations').where('service', '==', 'metra').get()
    const stopIdToSlug = new Map<string, string>()
    const stopIdToName = new Map<string, string>()
    for (const doc of stationSnap.docs) {
      const d = doc.data()
      if (d.metraStopId) {
        stopIdToSlug.set(d.metraStopId as string, doc.id)
        stopIdToName.set(d.metraStopId as string, d.name as string)
      }
    }

    // Load Metra line mappings from Firestore
    const lineSnap = await db.collection('lines').where('service', '==', 'metra').get()
    const lineCodeToSlug = new Map<string, string>()
    const lineCodeToName = new Map<string, string>()
    for (const doc of lineSnap.docs) {
      const d = doc.data()
      if (d.metraLineCode) {
        lineCodeToSlug.set(d.metraLineCode as string, doc.id)
        lineCodeToName.set(d.metraLineCode as string, d.name as string)
      }
    }

    logger.info(
      `Loaded ${stopIdToSlug.size} Metra stations, ${lineCodeToSlug.size} lines from Firestore`,
    )

    // Download and parse
    const buf = await downloadBuffer(METRA_GTFS_URL)
    const zip = new AdmZip(buf)
    logger.info('Metra GTFS downloaded, parsing')

    // 1. Schedules
    const schedules = parseMetraSchedules(zip, stopIdToSlug)
    const scheduleDocs = new Map<string, Record<string, unknown>>()
    for (const [slug, schedule] of schedules) {
      scheduleDocs.set(slug, schedule as unknown as Record<string, unknown>)
    }
    const schedulesWritten = await batchWrite('schedules', scheduleDocs)

    // 2. Trip details, indexes, station trips
    const { tripDetails, tripIndexes, stationTrips } = parseMetraTrips(
      zip,
      stopIdToSlug,
      stopIdToName,
      lineCodeToSlug,
      lineCodeToName,
    )

    const tripDetailDocs = new Map<string, Record<string, unknown>>()
    for (const [id, detail] of tripDetails) {
      tripDetailDocs.set(id, detail as unknown as Record<string, unknown>)
    }
    const tripsWritten = await batchWrite('metra-trips', tripDetailDocs)

    const tripIndexDocs = new Map<string, Record<string, unknown>>()
    for (const [slug, index] of tripIndexes) {
      tripIndexDocs.set(slug, index as unknown as Record<string, unknown>)
    }
    const indexesWritten = await batchWrite('metra-trip-indexes', tripIndexDocs)

    const stationTripDocs = new Map<string, Record<string, unknown>>()
    for (const [slug, trips] of stationTrips) {
      stationTripDocs.set(slug, trips as unknown as Record<string, unknown>)
    }
    const stationTripsWritten = await batchWrite('metra-station-trips', stationTripDocs)

    logger.info('Metra sync complete', {
      schedulesWritten,
      tripsWritten,
      indexesWritten,
      stationTripsWritten,
    })

    await updateMetraMeta(publishedTimestamp)
  },
)
