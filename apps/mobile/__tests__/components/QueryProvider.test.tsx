import { render, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import QueryProvider from '../../components/QueryProvider'

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>()
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v)
      }),
      removeItem: jest.fn(async (k: string) => {
        store.delete(k)
      }),
      clear: jest.fn(async () => store.clear()),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
    },
  }
})

function Probe() {
  const client = useQueryClient()
  return <Text testID="probe">{client ? 'client-present' : 'no-client'}</Text>
}

describe('QueryProvider (mobile)', () => {
  it('provides a TanStack Query client to children', async () => {
    const { getByTestId } = render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    )
    expect(getByTestId('probe').props.children).toBe('client-present')
    // wait for PersistQueryClientProvider's async hydration to settle inside act
    await waitFor(() => {
      expect(getByTestId('probe').props.children).toBe('client-present')
    })
  })
})
