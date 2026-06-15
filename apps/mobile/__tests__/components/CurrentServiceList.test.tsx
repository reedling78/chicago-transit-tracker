import { render, screen, fireEvent } from '@testing-library/react-native'
import type { CurrentServiceTrain } from '@ctt/shared'
import CurrentServiceList from '../../components/CurrentServiceList'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const sampleTrains: CurrentServiceTrain[] = [
  {
    trainNumber: '1274',
    href: '/metra/bnsf/train/1274',
    destination: 'Aurora',
    nextStop: 'Naperville',
    nextStopEta: '3 min',
    statusLabel: 'On time',
    statusTone: 'ontime',
  },
  {
    trainNumber: '1286',
    href: '/metra/bnsf/train/1286',
    destination: 'Chicago Union Station',
    nextStop: 'Downers Grove',
    nextStopEta: '7 min',
    statusLabel: 'Delayed 5 min',
    statusTone: 'delayed',
  },
]

afterEach(() => {
  mockPush.mockClear()
})

describe('CurrentServiceList', () => {
  it('renders a row per train with destination, next stop and status', () => {
    render(<CurrentServiceList trains={sampleTrains} lineColor="#005595" />)
    expect(screen.getByText('#1274')).toBeOnTheScreen()
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
    expect(screen.getByText('Next: Naperville · 3 min')).toBeOnTheScreen()
    expect(screen.getByText('On time')).toBeOnTheScreen()
    expect(screen.getByText('Delayed 5 min')).toBeOnTheScreen()
  })

  it('navigates to the train detail route when a row is pressed', () => {
    render(<CurrentServiceList trains={sampleTrains} lineColor="#005595" />)
    fireEvent.press(screen.getByTestId('current-service-row-1274'))
    expect(mockPush).toHaveBeenCalledWith('/metra/bnsf/train/1274')
  })

  it('shows a loading skeleton (no empty message) while loading with no trains', () => {
    render(<CurrentServiceList trains={[]} loading lineColor="#005595" />)
    expect(screen.queryByText('No trains currently running.')).toBeNull()
  })

  it('shows the empty message when not loading and there are no trains', () => {
    render(
      <CurrentServiceList
        trains={[]}
        lineColor="#005595"
        emptyMessage="No more trains scheduled today."
      />,
    )
    expect(screen.getByText('No more trains scheduled today.')).toBeOnTheScreen()
  })

  it('renders a live feed error when present', () => {
    render(<CurrentServiceList trains={[]} lineColor="#005595" error="boom" />)
    expect(screen.getByText('Live feed error: boom')).toBeOnTheScreen()
  })

  it('shows an "Updated" timestamp sourced from fetchedAt (Metra compliance)', () => {
    const fetchedAt = new Date(2026, 5, 14, 9, 5, 0).getTime()
    render(<CurrentServiceList trains={sampleTrains} lineColor="#005595" fetchedAt={fetchedAt} />)
    expect(screen.getByText(/Updated/)).toBeOnTheScreen()
  })
})
