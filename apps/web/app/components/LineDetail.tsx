import type { Line } from '@lib/types'

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
