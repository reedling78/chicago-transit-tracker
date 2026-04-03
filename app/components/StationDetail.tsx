import Link from 'next/link'
import type { Station } from '../lib/types'
import { CTA_LINE_COLORS } from './CTALineIcon'

// Combined color map — CTA colors from the official branding guide (via CTALineIcon),
// plus Metra line colors. Used for line chips on station pages.
export const LINE_COLORS: Record<string, { bg: string; text: string }> = {
  // CTA lines — sourced from CTALineIcon (official branding guide colors)
  ...Object.fromEntries(
    Object.entries(CTA_LINE_COLORS).map(([name, { bg, fg }]) => [name, { bg, text: fg }]),
  ),
  // Metra lines
  BNSF: { bg: '#1A3D7A', text: '#fff' },
  'UP-N': { bg: '#007B40', text: '#fff' },
  'UP-NW': { bg: '#007B40', text: '#fff' },
  'UP-W': { bg: '#007B40', text: '#fff' },
  'MD-N': { bg: '#C8872A', text: '#fff' },
  'MD-W': { bg: '#C8872A', text: '#fff' },
  RI: { bg: '#BE0000', text: '#fff' },
  SWS: { bg: '#7B3F97', text: '#fff' },
  HC: { bg: '#4A7729', text: '#fff' },
  ME: { bg: '#003DA5', text: '#fff' },
  NCS: { bg: '#8B4513', text: '#fff' },
}

export const SERVICE_LABEL: Record<string, string> = {
  cta: 'CTA',
  metra: 'Metra',
  both: 'CTA + Metra',
}

export const SERVICE_COLOR: Record<string, string> = {
  cta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  metra: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  both: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const STATION_TYPE_LABEL: Record<string, string> = {
  elevated: 'Elevated',
  subway: 'Subway',
  at_grade: 'At Grade',
  terminal: 'Terminal',
  commuter_rail: 'Commuter Rail',
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 py-2 last:border-0 dark:border-gray-800">
      <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-300" /> No
    </span>
  )
}

interface StationDetailProps {
  station: Station
}

export default function StationDetail({ station }: StationDetailProps) {
  const hasLocation = station.location.latitude !== 0 || station.location.longitude !== 0
  const hasHours = !!station.hours
  const hasAmenities = station.amenities.length > 0
  const hasSystemIds = !!(station.ctaMapId || station.ctaStopId || station.metraStopId)
  const isCTA = station.service === 'cta' || station.service === 'both'

  return (
    <div>
      {/* Detail grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Location */}
        <SectionCard title="Location">
          {station.address && <Row label="Address" value={station.address} />}
          {station.municipality && <Row label="Municipality" value={station.municipality} />}
          {hasLocation && (
            <Row
              label="Coordinates"
              value={`${station.location.latitude.toFixed(5)}, ${station.location.longitude.toFixed(5)}`}
            />
          )}
          {station.wikipediaUrl && (
            <Row
              label="Wikipedia"
              value={
                <Link
                  href={station.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  View article ↗
                </Link>
              }
            />
          )}
          {station.metraLink && (station.service === 'metra' || station.service === 'both') && (
            <Row
              label="Metra Page"
              value={
                <Link
                  href={station.metraLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  View on metra.com ↗
                </Link>
              }
            />
          )}
        </SectionCard>

        {/* Service */}
        <SectionCard title="Service">
          {station.stationType && (
            <Row
              label="Station Type"
              value={STATION_TYPE_LABEL[station.stationType] ?? station.stationType}
            />
          )}
          <Row label="Terminal" value={<StatusBadge ok={station.terminal} />} />
          <Row label="24-Hour Service" value={<StatusBadge ok={station.open24Hours} />} />
          {hasHours && (
            <>
              <Row label="Weekday Hours" value={station.hours!.weekday} />
              <Row label="Saturday Hours" value={station.hours!.saturday} />
              <Row label="Sunday Hours" value={station.hours!.sunday} />
            </>
          )}
        </SectionCard>

        {/* Accessibility */}
        <SectionCard title="Accessibility">
          <Row label="ADA Accessible" value={<StatusBadge ok={station.accessibility.ada} />} />
          {isCTA && (
            <>
              <Row label="Elevator" value={<StatusBadge ok={station.accessibility.elevator} />} />
              <Row label="Escalator" value={<StatusBadge ok={station.accessibility.escalator} />} />
            </>
          )}
          <Row label="Parking" value={<StatusBadge ok={station.parking} />} />
          {hasAmenities && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {station.amenities.map((a) => (
                <span
                  key={a}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize dark:bg-gray-800 dark:text-gray-400"
                >
                  {a.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </SectionCard>

        {/* System IDs */}
        {hasSystemIds && (
          <SectionCard title="System IDs">
            {station.ctaMapId && <Row label="CTA Map ID" value={station.ctaMapId} />}
            {station.ctaStopId && <Row label="CTA Stop ID" value={station.ctaStopId} />}
            {station.metraStopId && <Row label="Metra Stop ID" value={station.metraStopId} />}
          </SectionCard>
        )}
      </div>
    </div>
  )
}
