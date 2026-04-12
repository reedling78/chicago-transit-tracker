'use client'

import { useEffect, useState } from 'react'
import { fetchMetraFeed } from '@lib/metra-realtime'

export default function MetraTripUpdates() {
  const [data, setData] =
    useState<ReturnType<typeof fetchMetraFeed> extends Promise<infer T> ? T | null : never>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const feed = await fetchMetraFeed('tripupdates')
        if (!active) return
        setData(feed)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 30_000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Trip Updates</h3>
      {loading && <p className="text-sm text-gray-500 dark:text-white/50">Loading...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {data && (
        <p className="text-sm text-gray-500 dark:text-white/50">
          {data.entity?.length ?? 0} entities — check console
        </p>
      )}
    </div>
  )
}
