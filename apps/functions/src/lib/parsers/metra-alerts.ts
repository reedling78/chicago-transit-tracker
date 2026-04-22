/**
 * Pure normalizer for Metra GTFS Realtime alert feeds.
 *
 * Accepts a decoded GTFS Realtime FeedMessage (from gtfs-realtime-bindings),
 * extracts alert entities, maps route IDs to human names and colors, and
 * returns a clean NormalizedAlert[] array.
 */

import type { NormalizedAlert, NormalizedAlertRoute } from './alert-types'
import { METRA_LINE_NAMES, METRA_LINE_COLORS } from '../alert-constants'

// ---------------------------------------------------------------------------
// Minimal GTFS Realtime types (subset needed for alert parsing)
// ---------------------------------------------------------------------------

interface GtfsTranslation {
  text?: string | null
  language?: string | null
}

interface GtfsTranslatedString {
  translation?: GtfsTranslation[] | null
}

interface GtfsEntitySelector {
  agencyId?: string | null
  routeId?: string | null
  routeType?: number | null
  stopId?: string | null
}

interface GtfsAlert {
  informedEntity?: GtfsEntitySelector[] | null
  headerText?: GtfsTranslatedString | null
  descriptionText?: GtfsTranslatedString | null
  url?: GtfsTranslatedString | null
}

export interface GtfsFeedEntity {
  id: string
  alert?: GtfsAlert | null
}

export interface GtfsFeedMessage {
  entity?: GtfsFeedEntity[] | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractText(field: GtfsTranslatedString | null | undefined): string {
  return field?.translation?.[0]?.text ?? ''
}

function toRoute(routeId: string): NormalizedAlertRoute {
  const colors = METRA_LINE_COLORS[routeId]
  return {
    routeId,
    routeName: METRA_LINE_NAMES[routeId] ?? routeId,
    color: colors?.bg ?? '#6b7280',
    textColor: colors?.text ?? '#fff',
  }
}

// ---------------------------------------------------------------------------
// Main normalizer
// ---------------------------------------------------------------------------

export function normalizeMetraAlerts(
  feed: GtfsFeedMessage,
  routeId?: string,
): NormalizedAlert[] {
  const entities = feed.entity ?? []
  const normalized: NormalizedAlert[] = []

  for (const entity of entities) {
    const alert = entity.alert
    if (!alert) continue

    const routeIds = (alert.informedEntity ?? [])
      .map((ie) => ie.routeId)
      .filter((r): r is string => Boolean(r))

    if (routeIds.length === 0) continue
    if (routeId && !routeIds.includes(routeId)) continue

    normalized.push({
      id: entity.id,
      headline: extractText(alert.headerText),
      description: extractText(alert.descriptionText),
      url: extractText(alert.url) || null,
      routes: routeIds.map(toRoute),
      severity: null,
      isMajor: false,
      impact: null,
      startTime: null,
      endTime: null,
      service: 'metra',
    })
  }

  return normalized
}
