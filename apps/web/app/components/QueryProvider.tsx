'use client'

import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { getQueryClient } from '@lib/queryClient'

const ONE_DAY = 1000 * 60 * 60 * 24

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())
  const [persister] = useState(() =>
    typeof window !== 'undefined'
      ? createSyncStoragePersister({
          storage: window.localStorage,
          key: 'ctt-query-cache',
        })
      : null,
  )

  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: ONE_DAY }}
      >
        {children}
      </PersistQueryClientProvider>
    )
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
