'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '@lib/firebase-client'
import type { Line, Station } from '@ctt/shared'

const ONE_DAY = 1000 * 60 * 60 * 24

interface MetraTripLite {
  trainNumber: string
  line: string
  lineName?: string
  headsign?: string
  serviceType?: string
}

export function useLinesQuery() {
  return useQuery<Line[]>({
    queryKey: ['dashboard', 'lines'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'lines'))
      return snap.docs.map((d) => d.data() as Line)
    },
    staleTime: ONE_DAY,
  })
}

export function useStationsQuery() {
  return useQuery<Station[]>({
    queryKey: ['dashboard', 'stations'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'stations'))
      return snap.docs.map((d) => d.data() as Station)
    },
    staleTime: ONE_DAY,
  })
}

export function useFavoriteTripQuery(tripId: string | null) {
  return useQuery<MetraTripLite | null>({
    queryKey: ['dashboard', 'metra-trip', tripId],
    queryFn: async () => {
      if (!tripId) return null
      const snap = await getDoc(doc(db, 'metra-trips', tripId))
      if (!snap.exists()) return null
      return snap.data() as MetraTripLite
    },
    enabled: !!tripId,
    staleTime: ONE_DAY,
  })
}
