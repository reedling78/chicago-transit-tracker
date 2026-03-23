/**
 * seed-lines.ts
 *
 * Populates the Firestore `lines` collection with metadata for all
 * 8 CTA L lines and 11 Metra commuter rail lines (19 total).
 *
 * Data is hardcoded from official CTA/Metra sources. Document IDs are
 * stable slugs (e.g. "red", "bnsf", "up-n") for easy lookup.
 *
 * Usage:
 *   npm run seed:lines
 */

import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

function initFirebase(): admin.firestore.Firestore {
  const saPath = path.join(__dirname, '..', 'service-account.json')
  if (fs.existsSync(saPath)) {
    const serviceAccount = require(saPath)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'chicago-transit-tracker',
    })
  }
  return admin.firestore()
}

// ---------------------------------------------------------------------------
// Line data
// ---------------------------------------------------------------------------

interface LineData {
  name: string
  shortName: string
  slug: string
  service: 'cta' | 'metra'
  color: string
  textColor: string
  termini: string[]
  stationCount: number
  routeMiles: number
  operatesOvernight: boolean
  peakFrequencyMins: number | null
  offPeakFrequencyMins: number | null
  firstTrainApprox: string | null
  lastTrainApprox: string | null
  type: 'rapid_transit' | 'commuter_rail'
  description: string
  ctaRouteId: string | null
  metraLineCode: string | null
  downtownTerminal: string | null
  operator: string | null
  countiesServed: string[]
  photoUrl: string | null
}

const LINES: Record<string, LineData> = {
  // -------------------------------------------------------------------------
  // CTA — 8 lines
  // -------------------------------------------------------------------------

  red: {
    name: 'Red Line',
    shortName: 'Red',
    slug: 'red',
    service: 'cta',
    color: '#C60C30',
    textColor: '#FFFFFF',
    termini: ['Howard', '95th/Dan Ryan'],
    stationCount: 33,
    routeMiles: 23.2,
    operatesOvernight: true,
    peakFrequencyMins: 5,
    offPeakFrequencyMins: 10,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'rapid_transit',
    description:
      "Chicago's busiest rail line, running north–south through the heart of the city. Provides 24-hour service and serves both O'Hare and Midway airport connections via transfers.",
    ctaRouteId: 'Red',
    metraLineCode: null,
    downtownTerminal: null,
    operator: null,
    countiesServed: [],
    photoUrl: null,
  },

  blue: {
    name: 'Blue Line',
    shortName: 'Blue',
    slug: 'blue',
    service: 'cta',
    color: '#00A1DE',
    textColor: '#FFFFFF',
    termini: ["O'Hare", 'Forest Park'],
    stationCount: 33,
    routeMiles: 25.8,
    operatesOvernight: true,
    peakFrequencyMins: 7,
    offPeakFrequencyMins: 10,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'rapid_transit',
    description:
      "Runs 24 hours a day and provides direct rail access to O'Hare International Airport. Serves the northwest side, downtown Loop, and the western suburbs to Forest Park.",
    ctaRouteId: 'Blue',
    metraLineCode: null,
    downtownTerminal: null,
    operator: null,
    countiesServed: [],
    photoUrl: null,
  },

  green: {
    name: 'Green Line',
    shortName: 'Green',
    slug: 'green',
    service: 'cta',
    color: '#009B3A',
    textColor: '#FFFFFF',
    termini: ['Harlem/Lake', 'Cottage Grove / Ashland/63rd'],
    stationCount: 30,
    routeMiles: 20.5,
    operatesOvernight: false,
    peakFrequencyMins: 9,
    offPeakFrequencyMins: 12,
    firstTrainApprox: '4:15 AM',
    lastTrainApprox: '12:45 AM',
    type: 'rapid_transit',
    description:
      'Runs east–west along Lake Street on the north branch and south through the South Side, splitting into two branches at Ashland. Connects western suburbs to the Loop and south lakefront.',
    ctaRouteId: 'G',
    metraLineCode: null,
    downtownTerminal: null,
    operator: null,
    countiesServed: [],
    photoUrl: null,
  },

  brown: {
    name: 'Brown Line',
    shortName: 'Brown',
    slug: 'brown',
    service: 'cta',
    color: '#62361B',
    textColor: '#FFFFFF',
    termini: ['Kimball', 'Loop'],
    stationCount: 33,
    routeMiles: 11.4,
    operatesOvernight: false,
    peakFrequencyMins: 7,
    offPeakFrequencyMins: 10,
    firstTrainApprox: '4:20 AM',
    lastTrainApprox: '1:30 AM',
    type: 'rapid_transit',
    description:
      'Serves the North Side neighborhoods of Lincoln Square, Roscoe Village, and Ravenswood before heading into the Loop. One of the busiest lines during peak hours.',
    ctaRouteId: 'Brn',
    metraLineCode: null,
    downtownTerminal: null,
    operator: null,
    countiesServed: [],
    photoUrl: null,
  },

  purple: {
    name: 'Purple Line',
    shortName: 'Purple',
    slug: 'purple',
    service: 'cta',
    color: '#522398',
    textColor: '#FFFFFF',
    termini: ['Linden', 'Howard'],
    stationCount: 24,
    routeMiles: 9.5,
    operatesOvernight: false,
    peakFrequencyMins: 12,
    offPeakFrequencyMins: 20,
    firstTrainApprox: '5:00 AM',
    lastTrainApprox: '11:00 PM',
    type: 'rapid_transit',
    description:
      'Serves Evanston and Wilmette, connecting to the Red Line at Howard. Peak-hour Purple Line Express trains run directly to the Loop without stopping at all Red Line stations.',
    ctaRouteId: 'P',
    metraLineCode: null,
    downtownTerminal: null,
    operator: null,
    countiesServed: [],
    photoUrl: null,
  },

  yellow: {
    name: 'Yellow Line',
    shortName: 'Yellow',
    slug: 'yellow',
    service: 'cta',
    color: '#F9E300',
    textColor: '#000000',
    termini: ['Dempster-Skokie', 'Howard'],
    stationCount: 4,
    routeMiles: 2.8,
    operatesOvernight: false,
    peakFrequencyMins: 15,
    offPeakFrequencyMins: 15,
    firstTrainApprox: '4:55 AM',
    lastTrainApprox: '11:00 PM',
    type: 'rapid_transit',
    description:
      "The shortest CTA line, sometimes called the 'Skokie Swift.' Connects Skokie to the Howard Red/Purple Line terminal with limited stops.",
    ctaRouteId: 'Y',
    metraLineCode: null,
    downtownTerminal: null,
    operator: null,
    countiesServed: [],
    photoUrl: null,
  },

  pink: {
    name: 'Pink Line',
    shortName: 'Pink',
    slug: 'pink',
    service: 'cta',
    color: '#E27EA6',
    textColor: '#FFFFFF',
    termini: ['54th/Cermak', 'Loop'],
    stationCount: 22,
    routeMiles: 10.3,
    operatesOvernight: false,
    peakFrequencyMins: 10,
    offPeakFrequencyMins: 12,
    firstTrainApprox: '4:00 AM',
    lastTrainApprox: '12:30 AM',
    type: 'rapid_transit',
    description:
      'Serves the Pilsen and Little Village neighborhoods on the Lower West Side before joining the elevated Loop structure downtown. Introduced in 2006.',
    ctaRouteId: 'Pink',
    metraLineCode: null,
    downtownTerminal: null,
    operator: null,
    countiesServed: [],
    photoUrl: null,
  },

  orange: {
    name: 'Orange Line',
    shortName: 'Orange',
    slug: 'orange',
    service: 'cta',
    color: '#F9461C',
    textColor: '#FFFFFF',
    termini: ['Midway', 'Loop'],
    stationCount: 13,
    routeMiles: 10.1,
    operatesOvernight: false,
    peakFrequencyMins: 10,
    offPeakFrequencyMins: 12,
    firstTrainApprox: '3:25 AM',
    lastTrainApprox: '12:45 AM',
    type: 'rapid_transit',
    description:
      'Provides direct rail service to Midway International Airport. Runs through the Southwest Side neighborhoods of Englewood, Back of the Yards, and Bridgeport.',
    ctaRouteId: 'Org',
    metraLineCode: null,
    downtownTerminal: null,
    operator: null,
    countiesServed: [],
    photoUrl: null,
  },

  // -------------------------------------------------------------------------
  // Metra — 11 lines
  // -------------------------------------------------------------------------

  bnsf: {
    name: 'BNSF Railway Line',
    shortName: 'BNSF',
    slug: 'bnsf',
    service: 'metra',
    color: '#1A3D7A',
    textColor: '#FFFFFF',
    termini: ['Chicago Union Station', 'Aurora'],
    stationCount: 23,
    routeMiles: 37.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'One of the busiest commuter rail lines in the US, running from Chicago Union Station to Aurora through the western suburbs of Naperville and Downers Grove.',
    ctaRouteId: null,
    metraLineCode: 'BNSF',
    downtownTerminal: 'Union Station',
    operator: 'BNSF Railway',
    countiesServed: ['Cook', 'DuPage', 'Kane'],
    photoUrl: null,
  },

  'up-n': {
    name: 'Union Pacific North Line',
    shortName: 'UP-N',
    slug: 'up-n',
    service: 'metra',
    color: '#007B40',
    textColor: '#FFFFFF',
    termini: ['Ogilvie Transportation Center', 'Kenosha'],
    stationCount: 26,
    routeMiles: 51.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      "Runs from Ogilvie Transportation Center north along Lake Michigan through Evanston, Wilmette, Waukegan, and Winthrop Harbor, ending in Kenosha, Wisconsin.",
    ctaRouteId: null,
    metraLineCode: 'UP-N',
    downtownTerminal: 'Ogilvie Transportation Center',
    operator: 'Union Pacific',
    countiesServed: ['Cook', 'Lake'],
    photoUrl: null,
  },

  'up-nw': {
    name: 'Union Pacific Northwest Line',
    shortName: 'UP-NW',
    slug: 'up-nw',
    service: 'metra',
    color: '#007B40',
    textColor: '#FFFFFF',
    termini: ['Ogilvie Transportation Center', 'Harvard / McHenry'],
    stationCount: 35,
    routeMiles: 58.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'Runs northwest from Ogilvie through the suburbs of Arlington Heights, Barrington, and Crystal Lake before splitting into branches to Harvard and McHenry.',
    ctaRouteId: null,
    metraLineCode: 'UP-NW',
    downtownTerminal: 'Ogilvie Transportation Center',
    operator: 'Union Pacific',
    countiesServed: ['Cook', 'Lake', 'McHenry'],
    photoUrl: null,
  },

  'up-w': {
    name: 'Union Pacific West Line',
    shortName: 'UP-W',
    slug: 'up-w',
    service: 'metra',
    color: '#007B40',
    textColor: '#FFFFFF',
    termini: ['Ogilvie Transportation Center', 'Elburn'],
    stationCount: 19,
    routeMiles: 42.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'Heads west from Ogilvie through Oak Park, Elmhurst, Wheaton, and Geneva before terminating in Elburn. Shares the Oak Park stop block with the CTA Blue Line.',
    ctaRouteId: null,
    metraLineCode: 'UP-W',
    downtownTerminal: 'Ogilvie Transportation Center',
    operator: 'Union Pacific',
    countiesServed: ['Cook', 'DuPage', 'Kane'],
    photoUrl: null,
  },

  'md-n': {
    name: 'Milwaukee District North Line',
    shortName: 'MD-N',
    slug: 'md-n',
    service: 'metra',
    color: '#C8872A',
    textColor: '#FFFFFF',
    termini: ['Chicago Union Station', 'Fox Lake'],
    stationCount: 26,
    routeMiles: 51.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'Travels northwest from Union Station through the suburbs of Glenview, Deerfield, and Libertyville before ending at Fox Lake.',
    ctaRouteId: null,
    metraLineCode: 'MD-N',
    downtownTerminal: 'Union Station',
    operator: 'Metra',
    countiesServed: ['Cook', 'Lake'],
    photoUrl: null,
  },

  'md-w': {
    name: 'Milwaukee District West Line',
    shortName: 'MD-W',
    slug: 'md-w',
    service: 'metra',
    color: '#C8872A',
    textColor: '#FFFFFF',
    termini: ['Chicago Union Station', 'Elgin'],
    stationCount: 19,
    routeMiles: 37.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'Runs west from Union Station through Schiller Park, Itasca, Roselle, and Hanover Park, ending in Elgin.',
    ctaRouteId: null,
    metraLineCode: 'MD-W',
    downtownTerminal: 'Union Station',
    operator: 'Metra',
    countiesServed: ['Cook', 'DuPage', 'Kane'],
    photoUrl: null,
  },

  ri: {
    name: 'Rock Island Line',
    shortName: 'RI',
    slug: 'ri',
    service: 'metra',
    color: '#BE0000',
    textColor: '#FFFFFF',
    termini: ['LaSalle Street Station', 'Joliet / Blue Island'],
    stationCount: 30,
    routeMiles: 40.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'Departs LaSalle Street Station and runs south through Beverly/Morgan Park and the south suburbs before splitting into main line (Joliet) and Beverly/Blue Island branches.',
    ctaRouteId: null,
    metraLineCode: 'RI',
    downtownTerminal: 'LaSalle Street Station',
    operator: 'Metra',
    countiesServed: ['Cook', 'Will'],
    photoUrl: null,
  },

  sws: {
    name: 'SouthWest Service Line',
    shortName: 'SWS',
    slug: 'sws',
    service: 'metra',
    color: '#7B3F97',
    textColor: '#FFFFFF',
    termini: ['Chicago Union Station', 'Manhattan'],
    stationCount: 9,
    routeMiles: 39.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'One of the least-frequent Metra lines, running southwest from Union Station through Orland Park and Tinley Park to Manhattan in Will County.',
    ctaRouteId: null,
    metraLineCode: 'SWS',
    downtownTerminal: 'Union Station',
    operator: 'Metra',
    countiesServed: ['Cook', 'Will'],
    photoUrl: null,
  },

  hc: {
    name: 'Heritage Corridor Line',
    shortName: 'HC',
    slug: 'hc',
    service: 'metra',
    color: '#4A7729',
    textColor: '#FFFFFF',
    termini: ['Chicago Union Station', 'Joliet'],
    stationCount: 6,
    routeMiles: 33.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'Limited weekday service only — runs just a handful of inbound morning and outbound evening trains between Joliet and Union Station. Uses BNSF-owned track.',
    ctaRouteId: null,
    metraLineCode: 'HC',
    downtownTerminal: 'Union Station',
    operator: 'Metra',
    countiesServed: ['Cook', 'Will'],
    photoUrl: null,
  },

  me: {
    name: 'Metra Electric Line',
    shortName: 'ME',
    slug: 'me',
    service: 'metra',
    color: '#003DA5',
    textColor: '#FFFFFF',
    termini: ['Millennium Station', 'University Park / Blue Island / South Chicago'],
    stationCount: 31,
    routeMiles: 30.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'Chicago\'s only electrified commuter rail line, running from Millennium Station south through Hyde Park and the South Shore with three terminal branches. Operates on Metra-owned track.',
    ctaRouteId: null,
    metraLineCode: 'ME',
    downtownTerminal: 'Millennium Station',
    operator: 'Metra',
    countiesServed: ['Cook'],
    photoUrl: null,
  },

  ncs: {
    name: 'North Central Service Line',
    shortName: 'NCS',
    slug: 'ncs',
    service: 'metra',
    color: '#8B4513',
    textColor: '#FFFFFF',
    termini: ['Chicago Union Station', 'Antioch'],
    stationCount: 15,
    routeMiles: 50.0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description:
      'Runs north from Union Station through O\'Hare, Des Plaines, and Grayslake before ending in Antioch near the Wisconsin border. Passes through O\'Hare Airport area.',
    ctaRouteId: null,
    metraLineCode: 'NCS',
    downtownTerminal: 'Union Station',
    operator: 'Metra',
    countiesServed: ['Cook', 'Lake'],
    photoUrl: null,
  },
}

// ---------------------------------------------------------------------------
// Firestore write
// ---------------------------------------------------------------------------

async function writeLines(db: admin.firestore.Firestore): Promise<void> {
  const entries = Object.entries(LINES)
  const batch = db.batch()

  for (const [id, line] of entries) {
    const ref = db.collection('lines').doc(id)
    batch.set(ref, {
      ...line,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()
  console.log(`Wrote ${entries.length} lines to Firestore.`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const db = initFirebase()
  console.log(`Writing ${Object.keys(LINES).length} lines...`)
  await writeLines(db)
  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
