// Canonical GTFS / seed station names mapped to shorter rider-facing labels.
// The canonical names are kept verbatim in Firestore (needed for Metra
// realtime trip matching and the "verify with Metra" linkout) and slugs are
// never derived from this — these overrides apply at the display boundary only.
export const STATION_DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  'Chicago Union Station': 'Union Station',
  'Ogilvie Transportation Center': 'Ogilvie TC',
  'Chicago OTC': 'Ogilvie TC',
}

export function displayStationName<T extends string | null | undefined>(raw: T): T {
  if (!raw) return raw
  return (STATION_DISPLAY_NAME_OVERRIDES[raw] ?? raw) as T
}
