import { render, screen, act, fireEvent } from '@testing-library/react-native'
import type { StationSchedule } from '@ctt/shared'
import { ArrivalsCard, formatMinutesAway } from '../../components/ArrivalsCard'
import { mockSchedule, mockStationTrips } from '../fixtures'

// Mock @expo/vector-icons/Ionicons
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <Text>{name}</Text>,
  }
})

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Metra-aligned schedule whose weekday departure minutes match mockStationTrips entries
// (5:30 AM = 330, 6:00 AM = 360, 6:30 AM = 390)
const metraSchedule: StationSchedule = {
  directions: [
    {
      headsign: 'Chicago Union Station',
      line: 'BNSF',
      weekday: [330, 390],
      saturday: [],
      sunday: [],
    },
    {
      headsign: 'Aurora',
      line: 'BNSF',
      weekday: [360],
      saturday: [],
      sunday: [],
    },
  ],
}

describe('ArrivalsCard', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // Wednesday at 6:00 AM (360 minutes since midnight)
    jest.setSystemTime(new Date(2026, 3, 15, 6, 0, 0))
    mockPush.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders header with "CTA timetable" when service is cta', () => {
    render(<ArrivalsCard schedule={mockSchedule} service="cta" />)
    expect(screen.getByText(/CTA timetable/)).toBeOnTheScreen()
  })

  it('renders header with "Metra timetable" when service is metra', () => {
    render(<ArrivalsCard schedule={mockSchedule} service="metra" />)
    expect(screen.getByText(/Metra timetable/)).toBeOnTheScreen()
  })

  it('shows loading skeleton when loading is true and schedule is null', () => {
    render(<ArrivalsCard schedule={null} service="cta" loading={true} />)
    // Should not show empty text while loading
    expect(screen.queryByText('No upcoming departures found.')).toBeNull()
    expect(screen.queryByText('Schedule data unavailable for this station.')).toBeNull()
  })

  it('shows "No upcoming departures found." when schedule has no upcoming arrivals', () => {
    // Set time to 11:59 PM — past all scheduled times in mockSchedule
    jest.setSystemTime(new Date(2026, 3, 15, 23, 59, 0))
    render(<ArrivalsCard schedule={mockSchedule} service="cta" />)
    expect(screen.getByText('No upcoming departures found.')).toBeOnTheScreen()
  })

  it('shows "Schedule data unavailable" when schedule is null and not loading', () => {
    render(<ArrivalsCard schedule={null} service="cta" loading={false} />)
    expect(screen.getByText('Schedule data unavailable for this station.')).toBeOnTheScreen()
  })

  it('renders direction headers for upcoming arrivals', () => {
    // 6:00 AM on a weekday — mockSchedule has weekday times at 392 (6:32), 435, 480, etc.
    render(<ArrivalsCard schedule={mockSchedule} service="cta" />)
    expect(screen.getByText('Service toward Howard')).toBeOnTheScreen()
    expect(screen.getByText('Service toward 95th/Dan Ryan')).toBeOnTheScreen()
  })

  it('renders arrival rows with line name and formatted times', () => {
    render(<ArrivalsCard schedule={mockSchedule} service="cta" />)
    // mockSchedule Howard direction weekday times: 392 (6:32 AM), 435 (7:15 AM), 480 (8:00 AM)
    // At 6:00 AM, all three are upcoming
    expect(screen.getAllByText(/Red Line/).length).toBeGreaterThan(0)
    expect(screen.getByText(/6:32 AM/)).toBeOnTheScreen()
  })

  it('shows correct minutesAway values', () => {
    render(<ArrivalsCard schedule={mockSchedule} service="cta" />)
    // At 6:00 AM (360 min), first Howard departure at 392 min → 32 min away
    expect(screen.getByText('32 min')).toBeOnTheScreen()
  })

  it('handles null schedule gracefully', () => {
    render(<ArrivalsCard schedule={null} service="cta" />)
    expect(screen.getByText('Schedule data unavailable for this station.')).toBeOnTheScreen()
  })

  it('recomputes arrivals on 60-second interval', () => {
    render(<ArrivalsCard schedule={mockSchedule} service="cta" />)
    // Initially at 6:00 AM, Howard first = 32 min
    expect(screen.getByText('32 min')).toBeOnTheScreen()

    // Advance 2 minutes (advanceTimersByTime also shifts Date.now with fake timers)
    act(() => {
      jest.advanceTimersByTime(120_000)
    })

    // Now 30 min away (392 - 362 = 30)
    expect(screen.getByText('30 min')).toBeOnTheScreen()
  })

  it('renders approximate indicator for each arrival row', () => {
    render(<ArrivalsCard schedule={mockSchedule} service="cta" />)
    const approxIndicators = screen.getAllByText('≈')
    expect(approxIndicators.length).toBeGreaterThan(0)
  })

  it('renders rows as tappable when trips match the scheduled departures', () => {
    // 5:00 AM — 5:30, 6:00, 6:30 AM all upcoming
    jest.setSystemTime(new Date(2026, 3, 15, 5, 0, 0))
    render(<ArrivalsCard schedule={metraSchedule} service="metra" trips={mockStationTrips} />)
    expect(screen.getByTestId('arrival-row:/metra/bnsf/train/BNSF_BN1200_V4_A')).toBeOnTheScreen()
    expect(screen.getByTestId('arrival-row:/metra/bnsf/train/BNSF_BN1205_V4_A')).toBeOnTheScreen()
    expect(screen.getByTestId('arrival-row:/metra/bnsf/train/BNSF_BN1210_V4_A')).toBeOnTheScreen()
  })

  it('pushes the train detail route when a matched row is pressed', () => {
    jest.setSystemTime(new Date(2026, 3, 15, 5, 0, 0))
    render(<ArrivalsCard schedule={metraSchedule} service="metra" trips={mockStationTrips} />)
    fireEvent.press(screen.getByTestId('arrival-row:/metra/bnsf/train/BNSF_BN1200_V4_A'))
    expect(mockPush).toHaveBeenCalledWith('/metra/bnsf/train/BNSF_BN1200_V4_A')
  })

  it('does not render tappable rows when trips is not provided', () => {
    jest.setSystemTime(new Date(2026, 3, 15, 5, 0, 0))
    render(<ArrivalsCard schedule={metraSchedule} service="metra" />)
    expect(screen.getByText('30 min')).toBeOnTheScreen()
    expect(screen.queryByTestId(/^arrival-row:/)).toBeNull()
  })

  it('does not render a tappable row when no trip matches the scheduled time', () => {
    jest.setSystemTime(new Date(2026, 3, 15, 5, 0, 0))
    const unmatchedSchedule: StationSchedule = {
      directions: [
        {
          headsign: 'Chicago Union Station',
          line: 'BNSF',
          weekday: [345], // 5:45 AM — no matching trip
          saturday: [],
          sunday: [],
        },
      ],
    }
    render(<ArrivalsCard schedule={unmatchedSchedule} service="metra" trips={mockStationTrips} />)
    expect(screen.queryByTestId(/^arrival-row:/)).toBeNull()
  })
})

describe('formatMinutesAway', () => {
  it('returns "Due" for values less than 1', () => {
    expect(formatMinutesAway(0)).toBe('Due')
    expect(formatMinutesAway(-1)).toBe('Due')
  })

  it('returns "N min" for values less than 60', () => {
    expect(formatMinutesAway(1)).toBe('1 min')
    expect(formatMinutesAway(30)).toBe('30 min')
    expect(formatMinutesAway(59)).toBe('59 min')
  })

  it('returns "Nh" for exact hours', () => {
    expect(formatMinutesAway(60)).toBe('1h')
    expect(formatMinutesAway(120)).toBe('2h')
  })

  it('returns "Nh Mm" for hours with remaining minutes', () => {
    expect(formatMinutesAway(75)).toBe('1h 15m')
    expect(formatMinutesAway(130)).toBe('2h 10m')
  })
})
