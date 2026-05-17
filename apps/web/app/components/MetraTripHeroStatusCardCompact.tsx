import {
  TONE_CLASSES,
  formatClockTime,
  longToNumber,
  shortenStationName,
  type DestinationEta,
  type HeroStatus,
  type RightPanelCopy,
  type VehiclePosition,
} from '@ctt/shared'

export interface MetraTripHeroStatusCardCompactProps {
  status: HeroStatus
  vehiclePosition: VehiclePosition | null
  nextStop: RightPanelCopy | null
  destination: DestinationEta | null
  lineColor?: string
  lineTextColor?: string
}

/**
 * Live panel for the dashboard TrainCard, mirroring StationCard's expanded
 * layout: a "Service"-style header bar carrying the status + last-reported
 * line, then a line-colored row split into the next stop (left) and the ETA
 * to the user's destination stop (right).
 *
 * Per `.claude/rules/transit-compliance.md`, surfaces showing Metra realtime
 * data must include a "last reported" timestamp — rendered in the header bar.
 */
export default function MetraTripHeroStatusCardCompact({
  status,
  vehiclePosition,
  nextStop,
  destination,
  lineColor,
  lineTextColor,
}: MetraTripHeroStatusCardCompactProps) {
  const toneClass = TONE_CLASSES[status.tone]
  const timestampSec = vehiclePosition ? longToNumber(vehiclePosition.timestamp) : null
  const lastReported =
    timestampSec != null ? `Last reported ${formatClockTime(new Date(timestampSec * 1000))}` : null
  const nextDetail = nextStop ? [nextStop.time, nextStop.subtext].filter(Boolean).join(' · ') : ''
  const rowText = lineTextColor ?? '#fff'

  return (
    <div className="-mx-4 mt-0.5 -mb-4 overflow-hidden rounded-b-lg border-t border-gray-100 dark:border-gray-700">
      <div className="flex items-baseline justify-between gap-2 bg-gray-600 px-4 py-2 dark:bg-gray-700">
        <span className={`truncate text-sm font-semibold ${toneClass.text}`}>{status.label}</span>
        {lastReported && (
          <span className="shrink-0 text-xs font-normal text-white/70">{lastReported}</span>
        )}
      </div>
      {(nextStop || destination) && (
        <div
          className="flex items-start justify-between gap-3 border-t border-black/10 px-4 py-3 [text-shadow:0_1px_2px_rgb(0_0_0_/_45%)]"
          style={{ backgroundColor: lineColor ?? '#565a5c' }}
        >
          <div className="min-w-0">
            {nextStop && (
              <>
                <p className="text-xs text-white/80">{nextStop.title}</p>
                <p
                  className="truncate text-base leading-tight font-bold"
                  style={{ color: rowText }}
                >
                  {shortenStationName(nextStop.station)}
                </p>
                {nextDetail && <p className="mt-0.5 text-sm text-white/80">{nextDetail}</p>}
              </>
            )}
          </div>
          {destination && (
            <div className="min-w-0 text-right">
              <p className="text-xs text-white/80">
                Arrives {destination.etaClock}
                {destination.realtime ? '' : ' (est.)'}
              </p>
              <p className="truncate text-base leading-tight font-bold" style={{ color: rowText }}>
                {shortenStationName(destination.station)}
              </p>
              <p
                className="mt-0.5 text-sm leading-none font-bold tabular-nums"
                style={{ color: rowText }}
              >
                {destination.etaLabel}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
