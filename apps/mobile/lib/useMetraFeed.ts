/**
 * Mobile Metra realtime feed subscription hook.
 *
 * Mirrors the API surface of the web's `useMetraFeed` (apps/web/app/lib/hooks/useMetraFeed.ts):
 * - module-level cache keyed by feed type
 * - one in-flight fetch per feed regardless of subscriber count
 * - last unsubscriber stops polling
 *
 * Differs from web in two ways:
 * 1. Fetches the Cloud Functions endpoints `metraTripUpdates` / `metraPositions`,
 *    which return JSON (decoded server-side) — so the mobile bundle doesn't need
 *    a protobuf decoder.
 * 2. Pauses polling on `AppState` background instead of `document.visibilityState`.
 */

import { useEffect, useState } from 'react'
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native'
import type { FeedData } from '@ctt/shared'
import { FUNCTIONS_BASE_URL } from './config'

export type FeedType = 'tripupdates' | 'positions'

const ENDPOINT_FOR: Record<FeedType, string> = {
  tripupdates: `${FUNCTIONS_BASE_URL}/metraTripUpdates`,
  positions: `${FUNCTIONS_BASE_URL}/metraPositions`,
}

interface FeedState {
  data: FeedData | null
  error: string | null
  fetchedAt: number | null
  subscribers: Set<() => void>
  inFlight: Promise<void> | null
  intervalId: ReturnType<typeof setInterval> | null
  appStateSub: NativeEventSubscription | null
  intervalMs: number
}

const cache = new Map<FeedType, FeedState>()

function getOrCreate(feed: FeedType, intervalMs: number): FeedState {
  const existing = cache.get(feed)
  if (existing) return existing
  const state: FeedState = {
    data: null,
    error: null,
    fetchedAt: null,
    subscribers: new Set(),
    inFlight: null,
    intervalId: null,
    appStateSub: null,
    intervalMs,
  }
  cache.set(feed, state)
  return state
}

function notify(state: FeedState) {
  for (const sub of state.subscribers) sub()
}

async function fetchFeed(feed: FeedType): Promise<FeedData> {
  const res = await fetch(ENDPOINT_FOR[feed])
  if (!res.ok) {
    throw new Error(`Metra ${feed} returned ${res.status}`)
  }
  return (await res.json()) as FeedData
}

function doFetch(feed: FeedType, state: FeedState): Promise<void> {
  if (state.inFlight) return state.inFlight
  const p = fetchFeed(feed)
    .then((data) => {
      state.data = data
      state.error = null
      state.fetchedAt = Date.now()
    })
    .catch((err: unknown) => {
      state.error = err instanceof Error ? err.message : 'Unknown error'
      state.fetchedAt = Date.now()
    })
    .finally(() => {
      state.inFlight = null
      notify(state)
    })
  state.inFlight = p
  return p
}

function startPolling(feed: FeedType, state: FeedState) {
  if (state.intervalId != null) return
  const tick = () => {
    if (AppState.currentState !== 'active') return
    void doFetch(feed, state)
  }
  state.intervalId = setInterval(tick, state.intervalMs)
  // Resume immediately when the app returns to the foreground.
  state.appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'active') void doFetch(feed, state)
  })
}

function stopPolling(state: FeedState) {
  if (state.intervalId != null) {
    clearInterval(state.intervalId)
    state.intervalId = null
  }
  if (state.appStateSub) {
    state.appStateSub.remove()
    state.appStateSub = null
  }
}

export interface UseMetraFeedOptions {
  intervalMs?: number
  /**
   * When false, the subscriber is detached and polling stops for this
   * consumer. The last cached data (if any) is still returned so the
   * UI can continue to display it. Defaults to true.
   */
  enabled?: boolean
}

export interface UseMetraFeedResult {
  data: FeedData | null
  error: string | null
  /** Epoch millis of the most recent fetch (success or failure), or null. */
  fetchedAt: number | null
  loading: boolean
}

function snapshot(state: FeedState | undefined): UseMetraFeedResult {
  if (!state) return { data: null, error: null, fetchedAt: null, loading: true }
  return {
    data: state.data,
    error: state.error,
    fetchedAt: state.fetchedAt,
    loading: state.data == null && state.error == null,
  }
}

export function useMetraFeed(
  feed: FeedType,
  options: UseMetraFeedOptions = {},
): UseMetraFeedResult {
  const { intervalMs = 30_000, enabled = true } = options
  const [result, setResult] = useState<UseMetraFeedResult>(() => snapshot(cache.get(feed)))

  useEffect(() => {
    if (!enabled) return
    const state = getOrCreate(feed, intervalMs)
    const update = () => setResult(snapshot(state))
    state.subscribers.add(update)
    update()

    if (state.subscribers.size === 1) {
      startPolling(feed, state)
    }
    if (state.data == null && state.error == null && state.inFlight == null) {
      void doFetch(feed, state)
    }

    return () => {
      state.subscribers.delete(update)
      if (state.subscribers.size === 0) {
        stopPolling(state)
      }
    }
  }, [feed, intervalMs, enabled])

  return result
}

/**
 * Reset the module-level cache. Test-only.
 */
export function __resetMetraFeedCache() {
  for (const state of cache.values()) {
    stopPolling(state)
    state.subscribers.clear()
    state.data = null
    state.error = null
    state.fetchedAt = null
    state.inFlight = null
  }
  cache.clear()
}
