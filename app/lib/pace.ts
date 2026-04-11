import { cache } from 'react'
import type { DocumentData } from 'firebase-admin/firestore'
import { getFirestore } from './firebase-admin'
import type { PaceRoute, PaceStop, PaceRegion, PaceRouteServiceType } from './pace-types'

function toPaceRoute(id: string, d: DocumentData): PaceRoute {
  return {
    slug: d.slug ?? id,
    shortName: d.shortName,
    longName: d.longName,
    serviceType: (d.serviceType ?? 'local') as PaceRouteServiceType,
    region: (d.region ?? 'north') as PaceRegion,
    color: d.color ?? '#005DAA',
    textColor: d.textColor ?? '#FFFFFF',
    description: d.description ?? null,
    directions: d.directions ?? [],
  }
}

function toPaceStop(id: string, d: DocumentData): PaceStop {
  return {
    slug: d.slug ?? id,
    name: d.name,
    lat: d.lat ?? 0,
    lon: d.lon ?? 0,
    routes: d.routes ?? [],
    wheelchairBoarding: d.wheelchairBoarding ?? false,
  }
}

export const getAllPaceRoutes = cache(async (): Promise<PaceRoute[]> => {
  const db = getFirestore()
  const snap = await db.collection('pace-routes').get()
  return snap.docs
    .map((d) => toPaceRoute(d.id, d.data()))
    .sort((a, b) => a.shortName.localeCompare(b.shortName, undefined, { numeric: true }))
})

export const getPaceRoute = cache(async (slug: string): Promise<PaceRoute | null> => {
  const db = getFirestore()
  const doc = await db.collection('pace-routes').doc(slug).get()
  if (!doc.exists) return null
  return toPaceRoute(doc.id, doc.data()!)
})
