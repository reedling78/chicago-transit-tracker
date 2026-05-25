'use client'

import { useEffect } from 'react'
import { trackEvent } from '@lib/analytics'
import type { AnalyticsEventName, AnalyticsEventParams } from '@ctt/shared'

interface AnalyticsMountProps<E extends AnalyticsEventName> {
  event: E
  params: AnalyticsEventParams<E>
}

export default function AnalyticsMount<E extends AnalyticsEventName>({
  event,
  params,
}: AnalyticsMountProps<E>) {
  useEffect(() => {
    void trackEvent(event, params)
    // Fire once per mount. We deliberately ignore `event`/`params` changes —
    // a page re-render shouldn't re-emit an "opened" event. New routes mount
    // a fresh component anyway, which is when we want the next emission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
