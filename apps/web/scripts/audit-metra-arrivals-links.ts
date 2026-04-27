/**
 * audit-metra-arrivals-links.ts
 *
 * One-off audit: for every Metra station's currently-scheduled departures,
 * how many would link to /metra/[line]/train/[trainNumber] via the
 * schedule↔trips join used by Arrivals / ArrivalsCard, and how many miss.
 *
 * Run from apps/web/:
 *   npx ts-node --project scripts/tsconfig.json scripts/audit-metra-arrivals-links.ts
 */

import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

const PROJECT_ID = 'chicago-transit-tracker'

function initFirebase(): admin.firestore.Firestore {
  const saPath = path.join(__dirname, '..', 'service-account.json')
  if (fs.existsSync(saPath)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(saPath)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
    })
  }
  return admin.firestore()
}

type DayType = 'weekday' | 'saturday' | 'sunday'

interface DirectionSchedule {
  headsign: string
  line: string
  weekday: number[]
  saturday: number[]
  sunday: number[]
}
interface StationSchedule {
  directions: DirectionSchedule[]
}
interface StationTripEntry {
  tripId: string
  trainNumber: string
  headsign: string
  departure: string
  line: string
  lineSlug: string
  directionId: number
}
interface StationTrips {
  weekday: StationTripEntry[]
  saturday: StationTripEntry[]
  sunday: StationTripEntry[]
}

function getCurrentDayType(): DayType {
  const day = new Date().getDay()
  if (day === 0) return 'sunday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

interface RowAudit {
  stationSlug: string
  headsign: string
  line: string
  formattedTime: string
  candidateCount: number
  candidateKeys: string[]
}

const CTA_COLORS = new Set(['Red', 'Blue', 'Brown', 'Green', 'Orange', 'Purple', 'Pink', 'Yellow'])
function isMetraLine(line: string): boolean {
  return !CTA_COLORS.has(line)
}

interface StationDoc {
  service: string
  lines: string[]
}

async function main(): Promise<void> {
  const db = initFirebase()

  const stationsSnap = await db
    .collection('stations')
    .where('service', 'in', ['metra', 'both'])
    .get()
  const metraStations = stationsSnap.docs
    .map((d) => ({ slug: d.id, ...(d.data() as StationDoc) }))
    .filter((s) => s.service === 'metra' || (s.lines || []).some(isMetraLine))

  console.log(`Auditing ${metraStations.length} Metra stations...\n`)

  let totalRows = 0
  let totalMatched = 0
  let totalNoTripsDoc = 0
  let totalEmptyDayBucket = 0
  let totalRowsAtStationsWithTrips = 0
  let totalMatchedAtStationsWithTrips = 0
  const sampleMisses: RowAudit[] = []

  for (const station of metraStations) {
    const [scheduleSnap, tripsSnap] = await Promise.all([
      db.collection('schedules').doc(station.slug).get(),
      db.collection('metra-station-trips').doc(station.slug).get(),
    ])
    if (!scheduleSnap.exists) continue
    const schedule = scheduleSnap.data() as StationSchedule
    const trips = tripsSnap.exists ? (tripsSnap.data() as StationTrips) : null

    const dayType = getCurrentDayType()

    if (!trips) {
      for (const dir of schedule.directions || []) {
        const times = dir[dayType] || []
        if (!isMetraLine(dir.line)) continue
        totalRows += times.length
        totalNoTripsDoc += times.length
      }
      continue
    }

    const dayBucket = trips[dayType] || []
    if (dayBucket.length === 0) {
      for (const dir of schedule.directions || []) {
        const times = dir[dayType] || []
        if (!isMetraLine(dir.line)) continue
        totalRows += times.length
        totalEmptyDayBucket += times.length
      }
      continue
    }

    const tripLookup = new Map<string, StationTripEntry>()
    for (const entry of dayBucket) {
      const key = `${entry.headsign}|${entry.line}|${entry.departure}`
      tripLookup.set(key, entry)
    }

    for (const dir of schedule.directions || []) {
      if (!isMetraLine(dir.line)) continue
      const times = dir[dayType] || []
      for (const t of times) {
        const formatted = formatTime(t)
        const key = `${dir.headsign}|${dir.line}|${formatted}`
        const matched = tripLookup.has(key)
        totalRows++
        totalRowsAtStationsWithTrips++
        if (matched) {
          totalMatched++
          totalMatchedAtStationsWithTrips++
        } else if (sampleMisses.length < 25) {
          const candidates = dayBucket
            .filter((e) => e.headsign === dir.headsign && e.line === dir.line)
            .map((e) => `${e.headsign}|${e.line}|${e.departure}`)
          sampleMisses.push({
            stationSlug: station.slug,
            headsign: dir.headsign,
            line: dir.line,
            formattedTime: formatted,
            candidateCount: candidates.length,
            candidateKeys: candidates.slice(0, 8),
          })
        }
      }
    }
  }

  console.log(`=== Aggregate (today's service type) ===`)
  console.log(`Total scheduled Metra rows across all stations: ${totalRows}`)
  console.log(`Linked (lookup hit):                            ${totalMatched}`)
  console.log(`No trips doc for the station:                   ${totalNoTripsDoc}`)
  console.log(`Trips doc exists but empty for today:           ${totalEmptyDayBucket}`)
  if (totalRowsAtStationsWithTrips > 0) {
    const pct = (totalMatchedAtStationsWithTrips / totalRowsAtStationsWithTrips) * 100
    console.log(
      `At stations w/ trips: matched ${totalMatchedAtStationsWithTrips} / ${totalRowsAtStationsWithTrips} (${pct.toFixed(1)}%)`,
    )
  }

  if (sampleMisses.length > 0) {
    console.log(`\n=== Sample misses (up to 25) ===`)
    for (const m of sampleMisses) {
      console.log(
        `\nstation=${m.stationSlug} schedule_key="${m.headsign}|${m.line}|${m.formattedTime}"`,
      )
      if (m.candidateCount === 0) {
        console.log(`  no trip rows at this station for headsign+line`)
      } else {
        console.log(`  ${m.candidateCount} candidate(s) at same line+headsign:`)
        for (const c of m.candidateKeys) {
          console.log(`    "${c}"`)
        }
      }
    }
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
