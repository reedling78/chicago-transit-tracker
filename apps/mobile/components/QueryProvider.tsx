import { useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { getQueryClient } from '../lib/queryClient'

const ONE_DAY = 1000 * 60 * 60 * 24

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())
  const [persister] = useState(() =>
    createAsyncStoragePersister({ storage: AsyncStorage, key: 'ctt-query-cache' }),
  )

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: ONE_DAY }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
