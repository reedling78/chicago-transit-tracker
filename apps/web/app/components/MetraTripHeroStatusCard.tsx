import {
  TONE_CLASSES,
  formatClockTime,
  longToNumber,
  type DerivedStop,
  type HeroStatus,
  type TripPhase,
  type TripStop,
  type VehiclePosition,
} from '@lib/metra-status'
import { computeRightPanel } from '@lib/metra-trip-realtime-helpers'

export interface MetraTripHeroStatusCardProps {
  status: HeroStatus
  phase: TripPhase
  currentDerived: DerivedStop | undefined
  firstStop: TripStop | undefined
  lastStop: TripStop | undefined
  vehiclePosition: VehiclePosition | null
  lineColor: string
  error: string | null
  nowMs: number
}

export default function MetraTripHeroStatusCard({
  status,
  phase,
  currentDerived,
  firstStop,
  lastStop,
  vehiclePosition,
  lineColor,
  error,
  nowMs,
}: MetraTripHeroStatusCardProps) {
  const toneClass = TONE_CLASSES[status.tone]
  const rightPanel = computeRightPanel(phase, currentDerived, firstStop, lastStop, nowMs)

  const timestampSec = vehiclePosition ? longToNumber(vehiclePosition.timestamp) : null
  const lastReported =
    timestampSec != null ? `Last reported ${formatClockTime(new Date(timestampSec * 1000))}` : null

  return (
    <div
      className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      style={{ borderLeftWidth: '4px', borderLeftColor: lineColor }}
    >
      <div className="flex flex-col divide-y divide-gray-100 md:flex-row md:divide-x md:divide-y-0 dark:divide-gray-800">
        {/* Left panel: status */}
        <div className="flex-1 px-5 py-4">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Live status
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${toneClass.dot}`} />
            <p className={`text-2xl font-bold ${toneClass.text}`}>{status.label}</p>
          </div>
          {lastReported && (
            <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{lastReported}</p>
          )}
          {error && <p className="mt-1 text-xs text-red-500">Live feed error: {error}</p>}
        </div>

        {/* Right panel: next stop / departs / arrived */}
        {rightPanel && (
          <div className="flex-1 px-5 py-4">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
              {rightPanel.title}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {rightPanel.station}
            </p>
            <div className="mt-1 flex items-baseline gap-2 text-sm">
              {rightPanel.time && (
                <span className="font-semibold text-gray-700 tabular-nums dark:text-white/80">
                  {rightPanel.time}
                </span>
              )}
              {rightPanel.subtext && (
                <span className="text-gray-500 dark:text-white/50">{rightPanel.subtext}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
