import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from './firebase'
import type {
  Line,
  Station,
  StationSchedule,
  StationTrips,
  NormalizedAlert,
  TripStop,
} from '@ctt/shared'
import { FUNCTIONS_BASE_URL } from './config'

export interface MetraTripDetail {
  tripId: string
  trainNumber: string
  headsign: string
  line: string
  lineSlug: string
  lineName: string
  serviceType: 'weekday' | 'saturday' | 'sunday'
  directionId: number
  stops: TripStop[]
}

export function useLines(service: 'cta' | 'metra') {
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'lines'), where('service', '==', service))
    getDocs(q).then((snap) => {
      setLines(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Line))
      setLoading(false)
    })
  }, [service])

  return { lines, loading }
}

export function useStation(slug: string) {
  const [station, setStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'stations', slug)).then((snap) => {
      if (snap.exists()) {
        setStation({ id: snap.id, ...snap.data() } as Station)
      }
      setLoading(false)
    })
  }, [slug])

  return { station, loading }
}

export function useLineStations(lineSlug: string, lineShortName: string) {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'stations'), where('lines', 'array-contains', lineShortName))
    getDocs(q).then((snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Station)
      results.sort(
        (a, b) => (a.lineOrder?.[lineShortName] ?? 999) - (b.lineOrder?.[lineShortName] ?? 999),
      )
      setStations(results)
      setLoading(false)
    })
  }, [lineSlug, lineShortName])

  return { stations, loading }
}

export function useLine(slug: string) {
  const [line, setLine] = useState<Line | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'lines', slug)).then((snap) => {
      if (snap.exists()) {
        setLine({ id: snap.id, ...snap.data() } as Line)
      }
      setLoading(false)
    })
  }, [slug])

  return { line, loading }
}

export function useAlerts(service: 'cta' | 'metra', routeId?: string) {
  const [alerts, setAlerts] = useState<NormalizedAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setRetryCount((c) => c + 1)
  }, [])

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const endpoint = service === 'cta' ? 'ctaAlerts' : 'metraAlerts'
        const params = routeId ? `?routeId=${encodeURIComponent(routeId)}` : ''
        const url = `${FUNCTIONS_BASE_URL}/${endpoint}${params}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Alert API error: ${res.status}`)
        const data: NormalizedAlert[] = await res.json()
        if (active) {
          setAlerts(data)
          setError(null)
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (active) setLoading(false)
      }
    }

    poll()
    const interval = setInterval(poll, 30_000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [service, routeId, retryCount])

  return { alerts, loading, error, retry }
}

export function useSchedule(stationSlug: string) {
  const [schedule, setSchedule] = useState<StationSchedule | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'schedules', stationSlug))
      .then((snap) => {
        if (snap.exists()) {
          setSchedule(snap.data() as StationSchedule)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [stationSlug])

  return { schedule, loading }
}

export function useMetraTrip(lineSlug: string, trainNumber: string) {
  const [trip, setTrip] = useState<MetraTripDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lineSlug || !trainNumber) {
      setLoading(false)
      return
    }
    const id = `${lineSlug}_${trainNumber}`
    getDoc(doc(db, 'metra-trips', id))
      .then((snap) => {
        if (snap.exists()) {
          setTrip(snap.data() as MetraTripDetail)
        } else {
          setTrip(null)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [lineSlug, trainNumber])

  return { trip, loading }
}

export function useStationTrips(stationSlug: string) {
  const [stationTrips, setStationTrips] = useState<StationTrips | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'metra-station-trips', stationSlug))
      .then((snap) => {
        if (snap.exists()) {
          setStationTrips(snap.data() as StationTrips)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [stationSlug])

  return { stationTrips, loading }
}
