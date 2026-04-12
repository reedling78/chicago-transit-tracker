import { render, screen, waitFor } from '@testing-library/react'
import PaceScheduleTable from '@components/PaceScheduleTable'

global.fetch = jest.fn()

beforeEach(() => {
  ;(global.fetch as jest.Mock).mockReset()
})

describe('PaceScheduleTable', () => {
  const directions = [
    { id: '0', name: 'East to Evanston' },
    { id: '1', name: 'West to Schaumburg' },
  ]

  it('shows a loading state while fetching', () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}))
    render(<PaceScheduleTable stopSlug="golf" routeSlug="208" directions={directions} />)
    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
  })

  it('renders departure times for the selected direction and day', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: {
          '208': {
            directions: {
              '0': { weekday: [390, 405, 420], saturday: [], sunday: [] },
              '1': { weekday: [600, 615], saturday: [], sunday: [] },
            },
          },
        },
      }),
    })

    render(<PaceScheduleTable stopSlug="golf" routeSlug="208" directions={directions} />)

    await waitFor(() => expect(screen.getByText('6:30 AM')).toBeInTheDocument())
    expect(screen.getByText('6:45 AM')).toBeInTheDocument()
    expect(screen.getByText('7:00 AM')).toBeInTheDocument()
  })

  it('shows an empty state when no trips run on the selected day', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: {
          '208': {
            directions: {
              '0': { weekday: [390], saturday: [], sunday: [] },
            },
          },
        },
      }),
    })

    render(
      <PaceScheduleTable
        stopSlug="golf"
        routeSlug="208"
        directions={directions}
        initialServiceType="sunday"
      />,
    )

    await waitFor(() => expect(screen.getByText(/No scheduled service/i)).toBeInTheDocument())
  })

  it('shows an error state if fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))
    render(<PaceScheduleTable stopSlug="golf" routeSlug="208" directions={directions} />)
    await waitFor(() => expect(screen.getByText(/Unable to load schedule/i)).toBeInTheDocument())
  })

  it('resets activeDir when the directions prop no longer contains the current selection', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: {
          '208': {
            directions: {
              '0': { weekday: [390], saturday: [], sunday: [] },
              '1': { weekday: [600], saturday: [], sunday: [] },
              '9': { weekday: [720], saturday: [], sunday: [] },
            },
          },
        },
      }),
    })

    const { rerender } = render(
      <PaceScheduleTable stopSlug="golf" routeSlug="208" directions={directions} />,
    )

    // Initially direction '0' is active and 6:30 AM (390 minutes) shows
    await waitFor(() => expect(screen.getByText('6:30 AM')).toBeInTheDocument())

    // Rerender with a new directions list that does NOT include '0'
    const newDirections = [{ id: '9', name: 'North to Nowhere' }]
    rerender(<PaceScheduleTable stopSlug="golf" routeSlug="208" directions={newDirections} />)

    // activeDir should have reset to '9' — 12:00 PM (720 minutes) is shown
    await waitFor(() => expect(screen.getByText('12:00 PM')).toBeInTheDocument())
  })
})
