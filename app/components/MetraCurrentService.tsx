'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMetraFeed, type FeedData } from '@lib/hooks/useMetraFeed'
import { longToNumber, minutesSinceMidnight, type RealtimeState } from '@lib/metra-status'
import type { MetraLineTrip } from '@lib/transit'
import CurrentServiceList, { type CurrentServiceTrain } from './CurrentServiceList'
import {
  annotate,
  buildTrainRow,
  currentServiceType,
  extractMatchedRealtime,
  selectTrainsForDisplay,
} from '@lib/metra-current-service-helpers'

const POLL_INTERVAL_MS = 30_000

export interface MetraCurrentServiceProps {
  lineSlug: string
  lineColor: string
  trips: MetraLineTrip[]
}

// Re-export for existing callers/tests that imported from the component.
export { selectTrainsForDisplay }

export default function MetraCurrentService({
  lineSlug,
  lineColor,
  trips,
}: MetraCurrentServiceProps) {
  const tripUpdatesFeed = useMetraFeed('tripupdates', { intervalMs: POLL_INTERVAL_MS })
  const positionsFeed = useMetraFeed('positions', { intervalMs: POLL_INTERVAL_MS })
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  useEffect(() => {
    const nowInterval = setInterval(() => setNowMs(Date.now()), POLL_INTERVAL_MS)
    return () => clearInterval(nowInterval)
  }, [])

  const tripUpdates: FeedData | null = tripUpdatesFeed.data
  const positions: FeedData | null = positionsFeed.data
  const error = tripUpdatesFeed.error ?? positionsFeed.error
  const hasFetched = tripUpdatesFeed.fetchedAt != null || positionsFeed.fetchedAt != null

  const annotated = useMemo(() => annotate(trips), [trips])

  const { rows, emptyMessage } = useMemo(() => {
    const now = new Date(nowMs)
    const nowMinutes = minutesSinceMidnight(now)
    const serviceType = currentServiceType(now)

    const tuByTrain = extractMatchedRealtime(tripUpdates, lineSlug)
    const vpByTrain = extractMatchedRealtime(positions, lineSlug)

    const realtimeByTrain = new Map<string, RealtimeState>()
    const activeTrainNumbers = new Set<string>()
    for (const [trainNumber, tu] of tuByTrain.entries()) {
      const vp = vpByTrain.get(trainNumber)
      const state: RealtimeState = {
        tripUpdate: tu.tripUpdate,
        vehiclePosition: vp?.vehiclePosition ?? null,
        fetchedAt: nowMs,
        stopped: false,
      }
      realtimeByTrain.set(trainNumber, state)
      // "Active" = has a tripUpdate with non-skipped future stops
      const stu = tu.tripUpdate?.stopTimeUpdate ?? []
      const hasUpcoming = stu.some(
        (s) => s.scheduleRelationship !== 1 && longToNumber(s.arrival?.time ?? s.departure?.time),
      )
      if (hasUpcoming) activeTrainNumbers.add(trainNumber)
    }

    const { shown, fallbackOnly } = selectTrainsForDisplay(
      annotated,
      activeTrainNumbers,
      nowMinutes,
      serviceType,
    )

    const builtRows: CurrentServiceTrain[] = []
    for (const trip of shown) {
      const row = buildTrainRow(
        trip,
        realtimeByTrain.get(trip.trainNumber) ?? null,
        lineSlug,
        nowMs,
        nowMinutes,
      )
      if (row) builtRows.push(row)
    }

    let msg = 'No trains currently running.'
    if (fallbackOnly && shown[0]) {
      msg = `Next service at ${shown[0].stops[0]?.departure ?? shown[0].stops[0]?.arrival ?? ''}`
    } else if (shown.length === 0) {
      msg = 'No more trains scheduled today.'
    }

    return { rows: builtRows, emptyMessage: msg }
  }, [annotated, tripUpdates, positions, lineSlug, nowMs])

  return (
    <CurrentServiceList
      trains={rows}
      lineColor={lineColor}
      loading={!hasFetched}
      error={error}
      emptyMessage={emptyMessage}
    />
  )
}
