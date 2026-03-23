import type { Station } from '../lib/types'
import PageHeader from './PageHeader'

// Stable color map for line chips — covers all CTA and Metra lines
const LINE_COLORS: Record<string, { bg: string; text: string }> = {
  Red:     { bg: '#C60C30', text: '#fff' },
  Blue:    { bg: '#00A1DE', text: '#fff' },
  Green:   { bg: '#009B3A', text: '#fff' },
  Brown:   { bg: '#62361B', text: '#fff' },
  Purple:  { bg: '#522398', text: '#fff' },
  Yellow:  { bg: '#F9E300', text: '#000' },
  Pink:    { bg: '#E27EA6', text: '#fff' },
  Orange:  { bg: '#F9461C', text: '#fff' },
  BNSF:    { bg: '#1A3D7A', text: '#fff' },
  'UP-N':  { bg: '#007B40', text: '#fff' },
  'UP-NW': { bg: '#007B40', text: '#fff' },
  'UP-W':  { bg: '#007B40', text: '#fff' },
  'MD-N':  { bg: '#C8872A', text: '#fff' },
  'MD-W':  { bg: '#C8872A', text: '#fff' },
  RI:      { bg: '#BE0000', text: '#fff' },
  SWS:     { bg: '#7B3F97', text: '#fff' },
  HC:      { bg: '#4A7729', text: '#fff' },
  ME:      { bg: '#003DA5', text: '#fff' },
  NCS:     { bg: '#8B4513', text: '#fff' },
}

const SERVICE_LABEL: Record<string, string> = {
  cta: 'CTA',
  metra: 'Metra',
  both: 'CTA + Metra',
}

const SERVICE_COLOR: Record<string, string> = {
  cta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  metra: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  both: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const STATION_TYPE_LABEL: Record<string, string> = {
  elevated:     'Elevated',
  subway:       'Subway',
  at_grade:     'At Grade',
  terminal:     'Terminal',
  commuter_rail: 'Commuter Rail',
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900 p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{value}</span>
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
      <PageHeader
        title={station.name}
        badges={
          <>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${SERVICE_COLOR[station.service]}`}>
              {SERVICE_LABEL[station.service]}
            </span>
            {station.terminal && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Terminal
              </span>
            )}
            {station.open24Hours && (
              <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                24 Hours
              </span>
            )}
          </>
        }
      >
        {station.lines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {station.lines.map((line) => {
              const colors = LINE_COLORS[line]
              return colors ? (
                <span
                  key={line}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {line}
                </span>
              ) : (
                <span key={line} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {line}
                </span>
              )
            })}
          </div>
        )}
      </PageHeader>

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
        </SectionCard>

        {/* Service */}
        <SectionCard title="Service">
          {station.stationType && (
            <Row label="Station Type" value={STATION_TYPE_LABEL[station.stationType] ?? station.stationType} />
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
                <span key={a} className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 capitalize">
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
