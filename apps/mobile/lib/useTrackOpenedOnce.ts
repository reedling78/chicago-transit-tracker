import { useEffect, useRef } from 'react'
import { trackEvent } from './analytics'
import type { AnalyticsEventName, AnalyticsEventParams } from '@ctt/shared'

/**
 * Fire a single "opened" analytics event the first time the gating value
 * goes truthy. Useful on detail screens where the entity (line, station,
 * train) loads asynchronously after mount — we want one event per visit,
 * not one per render.
 *
 * The params builder is only called when the event actually fires, so it
 * can safely dereference the gated entity.
 */
export function useTrackOpenedOnce<E extends AnalyticsEventName>(
  ready: unknown,
  event: E,
  paramsBuilder: () => AnalyticsEventParams<E>,
): void {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current || !ready) return
    fired.current = true
    void trackEvent(event, paramsBuilder())
    // We intentionally only re-run on `ready` and `event` changes; paramsBuilder
    // is invoked once when fired.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, event])
}
