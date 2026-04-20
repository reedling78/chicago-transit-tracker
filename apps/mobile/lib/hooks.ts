import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from './firebase'
import type { Line, Station, StationSchedule, NormalizedAlert } from '@ctt/shared'
import { FUNCTIONS_BASE_URL } from './config'

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

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
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
  }, [service, routeId, loading])

  return { alerts, loading, error, retry }
}

export function useSchedule(stationSlug: string) {
  const [schedule, setSchedule] = useState<StationSchedule | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'schedules', stationSlug)).then((snap) => {
      if (snap.exists()) {
        setSchedule(snap.data() as StationSchedule)
      }
      setLoading(false)
    })
  }, [stationSlug])

  return { schedule, loading }
}
