'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchCtaTrainLocations, type CtaTrain } from '@lib/cta-train-tracker'
import { fetchCTAAlerts, type CTAAlert } from '@lib/cta-alerts'
import {
  aggregateByTerminal,
  computeHealth,
  nextArrivalFor,
  type PulseInputTrain,
} from '@lib/cta-pulse'
import type { Line } from '@lib/types'
import CtaServicePulse, { type DirectionPulse } from './CtaServicePulse'

const POLL_INTERVAL_MS = 30_000
const HIGH_SEVERITY_THRESHOLD = 50

function toPulseInput(train: CtaTrain): PulseInputTrain {
  return {
    rn: train.rn,
    destNm: train.destNm,
    nextStaNm: train.nextStaNm,
    arrTIso: train.arrT,
    isDly: train.isDly === '1',
  }
}

function alertMatchesLine(a: CTAAlert, serviceId: string): boolean {
  const svc = a.ImpactedService?.Service
  if (!svc) return false
  const services = Array.isArray(svc) ? svc : [svc]
  return services.some((s) => s.ServiceId === serviceId)
}

function hasHighSeverityAlertForLine(alerts: CTAAlert[], serviceId: string | null): boolean {
  if (!serviceId) return false
  return alerts.some((a) => {
    const score = parseInt(a.SeverityScore, 10)
    if (Number.isNaN(score) || score < HIGH_SEVERITY_THRESHOLD) return false
    return alertMatchesLine(a, serviceId)
  })
}

function firstAlertSnippet(alerts: CTAAlert[], serviceId: string | null): string | null {
  if (!serviceId) return null
  const match = alerts.find((a) => alertMatchesLine(a, serviceId))
  return match?.Headline ?? null
}

// Scheduled service hours: 4:00 AM - 1:30 AM for non-24-hour lines.
// 24-hour lines (Red, Blue) are always "in service" so zero trains reads as
// `major` rather than `no-service`.
function isInService(now: Date, operatesOvernight: boolean): boolean {
  if (operatesOvernight) return true
  const minutes = now.getHours() * 60 + now.getMinutes()
  return minutes >= 4 * 60 || minutes <= 1 * 60 + 30
}

export default function CtaServicePulseContainer({ line }: { line: Line }) {
  const [trains, setTrains] = useState<PulseInputTrain[] | null>(null)
  const [alerts, setAlerts] = useState<CTAAlert[]>([])
  const [error, setError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const [hasFetched, setHasFetched] = useState(false)

  const mountedRef = useRef(false)

  const routeCode = (line.ctaRouteId ?? '').toLowerCase()

  const load = useCallback(async () => {
    try {
      const [locations, alertList] = await Promise.all([
        fetchCtaTrainLocations(routeCode),
        fetchCTAAlerts(line.ctaRouteId ?? undefined),
      ])
      const route = locations.ctatt.route.find((r) => r['@name'].toLowerCase() === routeCode)
      const rawTrains = route?.train ?? []
      setTrains(rawTrains.map(toPulseInput))
      setAlerts(alertList)
      setNowMs(Date.now())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Use functional update so the callback does not depend on current trains
      // state — keeping load's identity stable prevents polling interval thrash.
      setTrains((prev) => prev ?? [])
    } finally {
      setHasFetched(true)
    }
  }, [routeCode, line.ctaRouteId])

  useEffect(() => {
    mountedRef.current = true
    load()
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      load()
    }, POLL_INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      mountedRef.current = false
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [load])

  const directions = useMemo<DirectionPulse[]>(() => {
    if (trains == null) return []
    const now = new Date(nowMs)
    const groups = aggregateByTerminal(trains, line.termini)
    const hasHighAlert = hasHighSeverityAlertForLine(alerts, line.ctaRouteId)
    const inService = isInService(now, line.operatesOvernight)

    const result: DirectionPulse[] = []
    for (const terminal of line.termini) {
      const direction = groups.get(terminal) ?? []
      const delayed = direction.filter((t) => t.isDly).length
      const health = computeHealth({
        trainCount: direction.length,
        delayedCount: delayed,
        hasHighAlert,
        inService,
      })
      const next = nextArrivalFor(direction, nowMs)
      result.push({
        terminalName: terminal,
        trainCount: direction.length,
        delayedCount: delayed,
        nextArrivalMinutes: next?.minutes ?? null,
        nextArrivalNearStation: next?.nearStation ?? null,
        healthLabel: health.label,
        healthTone: health.tone,
      })
    }
    return result
  }, [trains, alerts, nowMs, line.termini, line.ctaRouteId, line.operatesOvernight])

  const alertSnippet = firstAlertSnippet(alerts, line.ctaRouteId)

  return (
    <CtaServicePulse
      directions={directions}
      lineColor={line.color}
      loading={!hasFetched}
      error={error}
      alertSnippet={alertSnippet}
    />
  )
}
