export interface PulseInputTrain {
  rn: string
  destNm: string
  nextStaNm: string
  arrTIso: string // "2026-04-11T08:03:00"
  isDly: boolean
}

export type PulseTone = 'normal' | 'minor' | 'major' | 'no-service' | 'nodata'

export interface HealthResult {
  tone: PulseTone
  label: string
}

export interface HealthInput {
  trainCount: number
  delayedCount: number
  hasHighAlert: boolean
  inService: boolean
}

/**
 * Map a realtime destination name to one of the line's configured termini.
 * Handles slash-combined Green line termini and exact/startsWith matching for
 * the rest. Returns the matched terminal string (as it appears in line.termini)
 * or null if no match.
 */
export function terminalKeyFor(destNm: string, termini: string[]): string | null {
  const norm = destNm.trim().toLowerCase()
  for (const terminal of termini) {
    const t = terminal.trim().toLowerCase()
    if (t === norm) return terminal
    // Slash-combined: "Cottage Grove / Ashland/63rd" — split into pieces and
    // match the destination against each piece.
    if (t.includes(' / ')) {
      const parts = t.split(' / ').map((p) => p.trim())
      if (parts.includes(norm)) return terminal
    }
  }
  return null
}

export function aggregateByTerminal(
  trains: PulseInputTrain[],
  termini: string[],
): Map<string, PulseInputTrain[]> {
  const groups = new Map<string, PulseInputTrain[]>()
  for (const terminal of termini) groups.set(terminal, [])
  for (const train of trains) {
    const key = terminalKeyFor(train.destNm, termini)
    if (key == null) continue
    groups.get(key)!.push(train)
  }
  return groups
}

export function nextArrivalFor(
  trains: PulseInputTrain[],
  nowMs: number,
): { minutes: number; nearStation: string } | null {
  if (trains.length === 0) return null
  let best: PulseInputTrain | null = null
  let bestEta = Infinity
  for (const train of trains) {
    const eta = Date.parse(train.arrTIso)
    if (Number.isNaN(eta)) continue
    if (eta < bestEta) {
      bestEta = eta
      best = train
    }
  }
  if (best == null) return null
  const minutes = Math.max(0, Math.round((bestEta - nowMs) / 60_000))
  return { minutes, nearStation: best.nextStaNm }
}

export function computeHealth(input: HealthInput): HealthResult {
  const { trainCount, delayedCount, hasHighAlert, inService } = input

  if (trainCount === 0) {
    if (!inService) return { tone: 'no-service', label: 'No service' }
    return { tone: 'major', label: 'Major delays' }
  }

  // Majority delayed → major
  if (delayedCount > trainCount / 2) {
    return { tone: 'major', label: 'Major delays' }
  }

  // Any delay, alert, or thin service → minor
  if (delayedCount > 0 || hasHighAlert || trainCount < 3) {
    return { tone: 'minor', label: 'Minor delays' }
  }

  return { tone: 'normal', label: 'Running normally' }
}
