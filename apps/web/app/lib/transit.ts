import { cache } from 'react'
import { displayStationName } from '@ctt/shared'
import { getFirestore } from './firebase-admin'
import type { Line, Station } from './types'
import type { TripStop } from './metra-status'
import type { DocumentData } from 'firebase-admin/firestore'

export interface MetraLineTrip {
  trainNumber: string
  headsign: string
  serviceType: 'weekday' | 'saturday' | 'sunday'
  directionId: number
  stops: TripStop[]
}

function toLine(id: string, d: DocumentData): Line {
  return {
    id,
    name: d.name,
    shortName: d.shortName,
    slug: d.slug,
    service: d.service,
    color: d.color,
    textColor: d.textColor,
    termini: (d.termini ?? []).map(displayStationName),
    stationCount: d.stationCount ?? 0,
    routeMiles: d.routeMiles ?? 0,
    operatesOvernight: d.operatesOvernight ?? false,
    peakFrequencyMins: d.peakFrequencyMins ?? null,
    offPeakFrequencyMins: d.offPeakFrequencyMins ?? null,
    firstTrainApprox: d.firstTrainApprox ?? null,
    lastTrainApprox: d.lastTrainApprox ?? null,
    type: d.type,
    description: d.description,
    ctaRouteId: d.ctaRouteId ?? null,
    metraLineCode: d.metraLineCode ?? null,
    downtownTerminal: displayStationName(d.downtownTerminal ?? null),
    operator: d.operator ?? null,
    countiesServed: d.countiesServed ?? [],
    photoUrl: d.photoUrl ?? null,
    scheduleUrl: d.scheduleUrl ?? null,
  }
}

function toStation(id: string, d: DocumentData): Station {
  return {
    id,
    name: d.name,
    slug: d.slug,
    address: d.address ?? '',
    location: {
      latitude: d.location?.latitude ?? 0,
      longitude: d.location?.longitude ?? 0,
    },
    municipality: d.municipality ?? '',
    service: d.service,
    lines: d.lines ?? [],
    hours: d.hours ?? null,
    open24Hours: d.open24Hours ?? false,
    accessibility: d.accessibility ?? { ada: false, elevator: false, escalator: false },
    amenities: d.amenities ?? [],
    parking: d.parking ?? false,
    stationType: d.stationType ?? '',
    terminal: d.terminal ?? false,
    ctaStopId: d.ctaStopId ?? null,
    ctaMapId: d.ctaMapId ?? null,
    metraStopId: d.metraStopId ?? null,
    photoUrl: d.photoUrl ?? null,
    photoUrls: d.photoUrls ?? null,
    wikipediaUrl: d.wikipediaUrl ?? null,
    metraLink: d.metraLink ?? null,
    lineOrder: d.lineOrder ?? {},
  }
}

// React `cache()` memoizes these reads across `generateMetadata` and the page
// component within a single request. During `npm run build`, this halves the
// Firestore reads for every dynamic page (metadata + component previously
// each triggered their own fetch).

export const getLinesForService = cache(async (service: 'cta' | 'metra'): Promise<Line[]> => {
  const db = getFirestore()
  const snap = await db.collection('lines').where('service', '==', service).get()
  return snap.docs.map((d) => toLine(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))
})

export const getAllLines = cache(async (): Promise<Line[]> => {
  const db = getFirestore()
  const snap = await db.collection('lines').get()
  return snap.docs.map((d) => toLine(d.id, d.data()))
})

export const getLine = cache(async (slug: string): Promise<Line | null> => {
  const db = getFirestore()
  const doc = await db.collection('lines').doc(slug).get()
  if (!doc.exists) return null
  return toLine(doc.id, doc.data()!)
})

export const getStationsForLine = cache(async (lineShortName: string): Promise<Station[]> => {
  const db = getFirestore()
  const snap = await db.collection('stations').where('lines', 'array-contains', lineShortName).get()
  return snap.docs
    .map((d) => toStation(d.id, d.data()))
    .sort((a, b) => (a.lineOrder[lineShortName] ?? 9999) - (b.lineOrder[lineShortName] ?? 9999))
})

export const getMetraLineTrips = cache(async (lineSlug: string): Promise<MetraLineTrip[]> => {
  const db = getFirestore()
  const snap = await db.collection('metra-trips').where('lineSlug', '==', lineSlug).get()
  return snap.docs.map((doc) => {
    const d = doc.data()
    return {
      trainNumber: d.trainNumber,
      headsign: displayStationName(d.headsign),
      serviceType: d.serviceType,
      directionId: d.directionId ?? 0,
      stops: ((d.stops ?? []) as TripStop[]).map((s) => ({
        ...s,
        stationName: displayStationName(s.stationName),
      })),
    }
  })
})

export const getStation = cache(async (slug: string): Promise<Station | null> => {
  const db = getFirestore()
  const doc = await db.collection('stations').doc(slug).get()
  if (!doc.exists) return null
  return toStation(doc.id, doc.data()!)
})
