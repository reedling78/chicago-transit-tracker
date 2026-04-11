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
    termini: d.termini ?? [],
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
    downtownTerminal: d.downtownTerminal ?? null,
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
    wikipediaUrl: d.wikipediaUrl ?? null,
    metraLink: d.metraLink ?? null,
    lineOrder: d.lineOrder ?? {},
  }
}

export async function getLinesForService(service: 'cta' | 'metra'): Promise<Line[]> {
  const db = getFirestore()
  const snap = await db.collection('lines').where('service', '==', service).get()
  return snap.docs.map((d) => toLine(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAllLines(): Promise<Line[]> {
  const db = getFirestore()
  const snap = await db.collection('lines').get()
  return snap.docs.map((d) => toLine(d.id, d.data()))
}

export async function getLine(slug: string): Promise<Line | null> {
  const db = getFirestore()
  const doc = await db.collection('lines').doc(slug).get()
  if (!doc.exists) return null
  return toLine(doc.id, doc.data()!)
}

export async function getStationsForLine(lineShortName: string): Promise<Station[]> {
  const db = getFirestore()
  const snap = await db.collection('stations').where('lines', 'array-contains', lineShortName).get()
  return snap.docs
    .map((d) => toStation(d.id, d.data()))
    .sort((a, b) => (a.lineOrder[lineShortName] ?? 9999) - (b.lineOrder[lineShortName] ?? 9999))
}

export async function getMetraLineTrips(lineSlug: string): Promise<MetraLineTrip[]> {
  const db = getFirestore()
  const snap = await db.collection('metra-trips').where('lineSlug', '==', lineSlug).get()
  return snap.docs.map((doc) => {
    const d = doc.data()
    return {
      trainNumber: d.trainNumber,
      headsign: d.headsign,
      serviceType: d.serviceType,
      directionId: d.directionId ?? 0,
      stops: (d.stops ?? []) as TripStop[],
    }
  })
}

export async function getStation(slug: string): Promise<Station | null> {
  const db = getFirestore()
  const doc = await db.collection('stations').doc(slug).get()
  if (!doc.exists) return null
  return toStation(doc.id, doc.data()!)
}
