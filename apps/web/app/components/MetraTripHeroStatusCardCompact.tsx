import {
  TONE_CLASSES,
  computeRightPanel,
  formatClockTime,
  longToNumber,
  type DerivedStop,
  type HeroStatus,
  type TripPhase,
  type TripStop,
  type VehiclePosition,
} from '@ctt/shared'

export interface MetraTripHeroStatusCardCompactProps {
  status: HeroStatus
  phase: TripPhase
  currentDerived: DerivedStop | undefined
  firstStop: TripStop | undefined
  lastStop: TripStop | undefined
  vehiclePosition: VehiclePosition | null
  nowMs: number
}

/**
 * One-line variant of MetraTripHeroStatusCard for use inside dashboard cards.
 * Shows: tone dot + label · next-stop time · scheduled time line. Hidden by
 * the parent when phase is `nodata`.
 *
 * Per `.claude/rules/transit-compliance.md`, surfaces showing Metra realtime
 * data must include a "last reported" timestamp — rendered as the trailing
 * line.
 */
export default function MetraTripHeroStatusCardCompact({
  status,
  phase,
  currentDerived,
  firstStop,
  lastStop,
  vehiclePosition,
  nowMs,
}: MetraTripHeroStatusCardCompactProps) {
  const toneClass = TONE_CLASSES[status.tone]
  const rightPanel = computeRightPanel(phase, currentDerived, firstStop, lastStop, nowMs)

  const timestampSec = vehiclePosition ? longToNumber(vehiclePosition.timestamp) : null
  const lastReported =
    timestampSec != null ? `Last reported ${formatClockTime(new Date(timestampSec * 1000))}` : null

  return (
    <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${toneClass.dot}`} />
          <span className={`font-semibold ${toneClass.text}`}>{status.label}</span>
        </span>
        {rightPanel && (
          <>
            <span className="text-gray-400 dark:text-gray-500">·</span>
            <span className="text-gray-700 dark:text-gray-200">
              <span className="font-medium">{rightPanel.title}:</span> {rightPanel.station}
            </span>
            {rightPanel.time && (
              <span className="font-semibold text-gray-700 tabular-nums dark:text-gray-200">
                {rightPanel.time}
              </span>
            )}
            {rightPanel.subtext && (
              <span className="text-gray-500 dark:text-gray-400">{rightPanel.subtext}</span>
            )}
          </>
        )}
      </div>
      {lastReported && (
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{lastReported}</p>
      )}
    </div>
  )
}
