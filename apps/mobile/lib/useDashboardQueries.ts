import { useQuery } from '@tanstack/react-query'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import type { Line, Station, StationSchedule, StationTrips, MetraTripDetail } from '@ctt/shared'

const ONE_DAY = 1000 * 60 * 60 * 24
/** Schedule data is regenerated hourly at most; refresh every 30 minutes. */
const THIRTY_MINUTES = 1000 * 60 * 30

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

export function useStationScheduleQuery(slug: string | null) {
  return useQuery<StationSchedule | null>({
    queryKey: ['dashboard', 'station-schedule', slug],
    queryFn: async () => {
      if (!slug) return null
      const snap = await getDoc(doc(db, 'schedules', slug))
      if (!snap.exists()) return null
      return snap.data() as StationSchedule
    },
    enabled: !!slug,
    staleTime: THIRTY_MINUTES,
  })
}

export function useStationTripsQuery(slug: string | null, enabled = true) {
  return useQuery<StationTrips | null>({
    queryKey: ['dashboard', 'station-trips', slug],
    queryFn: async () => {
      if (!slug) return null
      const snap = await getDoc(doc(db, 'metra-station-trips', slug))
      if (!snap.exists()) return null
      return snap.data() as StationTrips
    },
    enabled: enabled && !!slug,
    staleTime: THIRTY_MINUTES,
  })
}

export function useFavoriteTripQuery(tripId: string | null) {
  return useQuery<MetraTripDetail | null>({
    queryKey: ['dashboard', 'metra-trip', tripId],
    queryFn: async () => {
      if (!tripId) return null
      const snap = await getDoc(doc(db, 'metra-trips', tripId))
      if (!snap.exists()) return null
      return snap.data() as MetraTripDetail
    },
    enabled: !!tripId,
    staleTime: ONE_DAY,
  })
}
