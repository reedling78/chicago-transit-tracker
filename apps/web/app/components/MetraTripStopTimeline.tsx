import { Steps } from '@components/Steps'
import type { StepStatus } from '@components/Steps'
import type { DerivedStop } from '@lib/metra-status'

interface Props {
  derivedStops: DerivedStop[]
  lineColor: string
  lineSlug: string
}

function StopMeta({
  status,
  skipped,
  time,
  delayMinutes,
}: {
  status: DerivedStop['status']
  skipped: boolean
  time: string
  delayMinutes: number | null
}) {
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-gray-900 tabular-nums dark:text-white">
      {skipped && (
        <span className="inline-block rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          Skipped
        </span>
      )}
      {!skipped && status === 'current' && (
        <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Next stop
        </span>
      )}
      <span>{time}</span>
      {!skipped && delayMinutes != null && delayMinutes > 0 && (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
          +{delayMinutes} min
        </span>
      )}
      {!skipped && delayMinutes != null && delayMinutes < 0 && (
        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {delayMinutes} min
        </span>
      )}
    </span>
  )
}

function mapStatus(raw: DerivedStop['status'], skipped: boolean): StepStatus {
  if (skipped) return 'skipped'
  if (raw === 'past') return 'past'
  if (raw === 'current') return 'current'
  return 'default'
}

export default function MetraTripStopTimeline({ derivedStops, lineColor, lineSlug }: Props) {
  return (
    <Steps color={lineColor}>
      {derivedStops.map((derived) => {
        const { stop, status, delayMinutes, skipped } = derived
        const mappedStatus = mapStatus(status, skipped)
        return (
          <Steps.Item
            key={stop.sequence}
            data-stop-sequence={stop.sequence}
            status={mappedStatus}
            href={stop.slug ? `/metra/${lineSlug}/${stop.slug}` : undefined}
            trailing={
              <StopMeta
                status={status}
                skipped={skipped}
                time={stop.departure}
                delayMinutes={delayMinutes}
              />
            }
          >
            <p className="font-semibold text-gray-900 group-hover:underline dark:text-white">
              {stop.stationName}
            </p>
          </Steps.Item>
        )
      })}
    </Steps>
  )
}
