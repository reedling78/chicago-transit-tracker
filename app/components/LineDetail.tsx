import Link from 'next/link'
import type { Line } from '../lib/types'
import PageHeader from './PageHeader'
import CTALineIcon from './CTALineIcon'

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

interface LineDetailProps {
  line: Line
}

export default function LineDetail({ line }: LineDetailProps) {
  const hasSchedule = !!(
    line.peakFrequencyMins ||
    line.offPeakFrequencyMins ||
    line.firstTrainApprox ||
    line.lastTrainApprox ||
    line.operatesOvernight
  )
  const hasMetraInfo = !!(line.downtownTerminal || line.operator || line.countiesServed.length > 0)
  const hasSystemId = !!(line.ctaRouteId || line.metraLineCode)

  return (
    <div>
      <PageHeader
        title={line.name}
        description={line.description}
        badges={
          <>
            {line.service === 'cta' ? (
              <CTALineIcon line={line.shortName} size={40} />
            ) : (
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: line.color, color: line.textColor }}
              >
                {line.shortName}
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {line.type === 'rapid_transit' ? 'Rapid Transit' : 'Commuter Rail'}
            </span>
            {line.operatesOvernight && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                24 Hours
              </span>
            )}
            {line.scheduleUrl && (
              <Link
                href={line.scheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                  <path d="M8 1a.75.75 0 0 1 .75.75v6.19l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.03a.75.75 0 0 1 1.06-1.06L7.25 7.94V1.75A.75.75 0 0 1 8 1ZM2.5 13.25a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Schedule PDF
              </Link>
            )}
          </>
        }
      />

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Stations', value: line.stationCount },
          { label: 'Route Miles', value: `${line.routeMiles} mi` },
          { label: 'From', value: line.termini[0] ?? '—' },
          { label: 'To', value: line.termini[1] ?? '—' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="mt-0.5 text-xs font-medium tracking-widest text-gray-400 uppercase dark:text-gray-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Detail cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hasSchedule && (
          <SectionCard title="Schedule">
            <Row label="24-Hour Service" value={<StatusBadge ok={line.operatesOvernight} />} />
            {line.peakFrequencyMins && (
              <Row label="Peak Frequency" value={`Every ${line.peakFrequencyMins} min`} />
            )}
            {line.offPeakFrequencyMins && (
              <Row label="Off-Peak Frequency" value={`Every ${line.offPeakFrequencyMins} min`} />
            )}
            {line.firstTrainApprox && <Row label="First Train" value={line.firstTrainApprox} />}
            {line.lastTrainApprox && <Row label="Last Train" value={line.lastTrainApprox} />}
          </SectionCard>
        )}

        {hasMetraInfo && (
          <SectionCard title="Operations">
            {line.downtownTerminal && (
              <Row label="Downtown Terminal" value={line.downtownTerminal} />
            )}
            {line.operator && <Row label="Operator" value={line.operator} />}
            {line.countiesServed.length > 0 && (
              <Row label="Counties Served" value={line.countiesServed.join(', ')} />
            )}
          </SectionCard>
        )}

        {hasSystemId && (
          <SectionCard title="System IDs">
            {line.ctaRouteId && <Row label="CTA Route ID" value={line.ctaRouteId} />}
            {line.metraLineCode && <Row label="Metra Line Code" value={line.metraLineCode} />}
          </SectionCard>
        )}
      </div>
    </div>
  )
}
