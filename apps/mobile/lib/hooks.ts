import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Line, Station, StationSchedule } from '@ctt/shared'

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
    const q = query(
      collection(db, 'stations'),
      where('lines', 'array-contains', lineShortName),
    )
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
