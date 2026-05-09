import { ActivityIndicator } from 'react-native'
import { render, screen } from '@testing-library/react-native'
import MetraTrainDetailScreen from '../../app/metra/[line]/train/[trainNumber]'
import { useMetraTrip } from '../../lib/hooks'

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return {
    LinearGradient: (props: Record<string, unknown>) => <View {...props} />,
  }
})

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react')
  const Stack = () => null
  Stack.displayName = 'Stack'
  const StackScreen = (props: { options?: { headerRight?: () => React.ReactNode } }) =>
    props.options?.headerRight ? props.options.headerRight() : null
  StackScreen.displayName = 'StackScreen'
  ;(Stack as unknown as { Screen: typeof StackScreen }).Screen = StackScreen
  return {
    useLocalSearchParams: () => ({ line: 'bnsf', trainNumber: '1200' }),
    Link: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement(ReactMock.Fragment, null, children),
    Stack,
  }
})

jest.mock('../../lib/hooks', () => ({
  useMetraTrip: jest.fn(),
}))

// Stub MetraTripRealtime so the screen test doesn't pull the polling +
// derivation stack into scope. The orchestrator has its own coverage.
jest.mock('../../components/MetraTripRealtime', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ trip }: { trip: { trainNumber: string } }) =>
      ReactMock.createElement(Text, null, `realtime:${trip.trainNumber}`),
  }
})

const mockUseMetraTrip = useMetraTrip as jest.MockedFunction<typeof useMetraTrip>

describe('MetraTrainDetailScreen', () => {
  it('shows a spinner while the trip document is loading', () => {
    mockUseMetraTrip.mockReturnValue({ trip: null, loading: true })
    render(<MetraTrainDetailScreen />)
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).not.toBeNull()
  })

  it('renders the train number in the PageHeader even while loading', () => {
    mockUseMetraTrip.mockReturnValue({ trip: null, loading: true })
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('Train 1200')).toBeOnTheScreen()
  })

  it('shows a friendly not-found message when the trip is missing', () => {
    mockUseMetraTrip.mockReturnValue({ trip: null, loading: false })
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('Train not found')).toBeOnTheScreen()
    expect(screen.getByText("We couldn't find 1200 on the BNSF line.")).toBeOnTheScreen()
  })

  it('renders the train number and line name in the PageHeader when the trip resolves', () => {
    mockUseMetraTrip.mockReturnValue({
      trip: {
        tripId: 't',
        trainNumber: '1200',
        headsign: 'Aurora',
        line: 'BNSF',
        lineSlug: 'bnsf',
        lineName: 'BNSF Railway',
        serviceType: 'weekday',
        directionId: 0,
        stops: [],
      },
      loading: false,
    })
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('Train 1200')).toBeOnTheScreen()
    expect(screen.getByText('BNSF Railway')).toBeOnTheScreen()
  })

  it('places the favorite button in the PageHeader title row', () => {
    mockUseMetraTrip.mockReturnValue({
      trip: {
        tripId: 't',
        trainNumber: '1200',
        headsign: 'Aurora',
        line: 'BNSF',
        lineSlug: 'bnsf',
        lineName: 'BNSF Railway',
        serviceType: 'weekday',
        directionId: 0,
        stops: [],
      },
      loading: false,
    })
    render(<MetraTrainDetailScreen />)
    const stub = screen.getByTestId('favorite-button-stub')
    expect(stub).toBeOnTheScreen()
    expect(stub.props.children).toBe('train:bnsf_1200')
  })

  it('renders MetraTripRealtime when the trip resolves', () => {
    mockUseMetraTrip.mockReturnValue({
      trip: {
        tripId: 't',
        trainNumber: '1200',
        headsign: 'Aurora',
        line: 'BNSF',
        lineSlug: 'bnsf',
        lineName: 'BNSF Railway',
        serviceType: 'weekday',
        directionId: 0,
        stops: [],
      },
      loading: false,
    })
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('realtime:1200')).toBeOnTheScreen()
  })

  it('renders the global Footer at the end of the scroll content', () => {
    mockUseMetraTrip.mockReturnValue({ trip: null, loading: false })
    render(<MetraTrainDetailScreen />)
    expect(screen.getByTestId('footer')).toBeOnTheScreen()
  })
})
