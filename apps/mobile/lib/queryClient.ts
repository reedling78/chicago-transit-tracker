import { QueryClient } from '@tanstack/react-query'

const ONE_MINUTE = 60 * 1000

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ONE_MINUTE,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let nativeClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (!nativeClient) nativeClient = makeQueryClient()
  return nativeClient
}
