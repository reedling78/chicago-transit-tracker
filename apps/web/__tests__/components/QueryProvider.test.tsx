import { render, waitFor } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import QueryProvider from '@components/QueryProvider'

function Probe() {
  const client = useQueryClient()
  return <div data-testid="probe">{client ? 'client-present' : 'no-client'}</div>
}

describe('QueryProvider', () => {
  it('provides a TanStack Query client to children', async () => {
    const { getByTestId } = render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    )
    expect(getByTestId('probe').textContent).toBe('client-present')
    // wait for PersistQueryClientProvider's async hydration to settle inside act
    await waitFor(() => {
      expect(getByTestId('probe').textContent).toBe('client-present')
    })
  })
})
