'use client'

/**
 * Shared Metra realtime feed subscription hook.
 *
 * Multiple components on the same page (e.g. MetraCurrentService +
 * MetraTripRealtime) can both subscribe to the same feed and share a
 * single in-flight fetch / polling interval. A module-level cache holds
 * one entry per feed type. The first subscriber starts polling; the
 * last unsubscriber stops it.
 */

import { useEffect, useState } from 'react'
import { fetchMetraFeed, type FeedType } from '@lib/metra-realtime'

export type FeedData = Awaited<ReturnType<typeof fetchMetraFeed>>

interface FeedState {
  data: FeedData | null
  error: string | null
  fetchedAt: number | null
  subscribers: Set<() => void>
  inFlight: Promise<void> | null
  intervalId: ReturnType<typeof setInterval> | null
  visibilityHandler: (() => void) | null
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
    visibilityHandler: null,
    intervalMs,
  }
  cache.set(feed, state)
  return state
}

function notify(state: FeedState) {
  for (const sub of state.subscribers) sub()
}

function doFetch(feed: FeedType, state: FeedState): Promise<void> {
  if (state.inFlight) return state.inFlight
  const p = fetchMetraFeed(feed)
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
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    void doFetch(feed, state)
  }
  state.intervalId = setInterval(tick, state.intervalMs)
  if (typeof document !== 'undefined') {
    const handler = () => {
      if (document.visibilityState === 'visible') void doFetch(feed, state)
    }
    state.visibilityHandler = handler
    document.addEventListener('visibilitychange', handler)
  }
}

function stopPolling(state: FeedState) {
  if (state.intervalId != null) {
    clearInterval(state.intervalId)
    state.intervalId = null
  }
  if (state.visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', state.visibilityHandler)
    state.visibilityHandler = null
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
 * Reset the module-level cache. Test-only: clears all pollers and
 * subscribers so tests start from a clean slate.
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
