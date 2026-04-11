import type { PulseTone } from '@lib/cta-pulse'

export type { PulseTone }

export interface DirectionPulse {
  terminalName: string
  trainCount: number
  delayedCount: number
  nextArrivalMinutes: number | null
  nextArrivalNearStation: string | null
  healthLabel: string
  healthTone: PulseTone
}

export interface CtaServicePulseProps {
  directions: DirectionPulse[]
  lineColor: string
  loading?: boolean
  error?: string | null
  alertSnippet?: string | null
}

const TONE_CLASSES: Record<PulseTone, { dot: string; text: string; pill: string }> = {
  normal: {
    dot: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  minor: {
    dot: 'bg-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    pill: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  major: {
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  'no-service': {
    dot: 'bg-gray-400',
    text: 'text-gray-500 dark:text-gray-400',
    pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  nodata: {
    dot: 'bg-gray-400',
    text: 'text-gray-500 dark:text-gray-400',
    pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
}

export default function CtaServicePulse({
  directions,
  lineColor,
  loading = false,
  error = null,
  alertSnippet = null,
}: CtaServicePulseProps) {
  return (
    <section
      className="mb-8 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      style={{ borderLeftWidth: '4px', borderLeftColor: lineColor }}
      data-testid="cta-service-pulse"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Current service
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
          Live
        </div>
      </div>

      {error && (
        <p className="px-5 py-4 text-sm text-red-500">Live service data unavailable: {error}</p>
      )}

      {loading && directions.length === 0 && !error && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {!loading && directions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {directions.map((d) => {
            const tone = TONE_CLASSES[d.healthTone]
            return (
              <div
                key={d.terminalName}
                className="rounded-lg border border-gray-100 p-4 dark:border-gray-800"
                data-tone={d.healthTone}
                data-testid={`pulse-card-${d.terminalName}`}
              >
                <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                  To
                </p>
                <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">
                  To {d.terminalName}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                  <span className={`text-sm font-semibold ${tone.text}`}>{d.healthLabel}</span>
                </div>

                <dl className="mt-3 space-y-1 text-sm text-gray-600 dark:text-white/70">
                  <div>
                    <dt className="sr-only">Trains running</dt>
                    <dd className="tabular-nums">
                      {d.trainCount} {d.trainCount === 1 ? 'train' : 'trains'} running
                    </dd>
                  </div>
                  {d.nextArrivalMinutes != null && d.nextArrivalNearStation && (
                    <div>
                      <dt className="sr-only">Next arrival</dt>
                      <dd>
                        Next train in{' '}
                        <span className="tabular-nums">{d.nextArrivalMinutes} min</span> near{' '}
                        {d.nextArrivalNearStation}
                      </dd>
                    </div>
                  )}
                  {d.delayedCount > 0 && (
                    <div>
                      <dt className="sr-only">Delay summary</dt>
                      <dd className="text-yellow-700 dark:text-yellow-400">
                        {d.delayedCount} of {d.trainCount} trains delayed
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )
          })}
        </div>
      )}

      {alertSnippet && (
        <div className="border-t border-gray-100 bg-yellow-50 px-5 py-3 text-sm text-yellow-900 dark:border-gray-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          <strong className="font-semibold">Alert:</strong> {alertSnippet}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-white/50">
        Powered by CTA Train Tracker. CTA Train Tracker (SM) logo icon is a trademark of the Chicago
        Transit Authority.
      </div>
    </section>
  )
}
