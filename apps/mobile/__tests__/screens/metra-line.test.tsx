import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { mockMetraLine, mockMetraStation } from '../fixtures'
import { useLine, useLineStations } from '../../lib/hooks'
import MetraLineDetailScreen from '../../app/(tabs)/metra/[line]'

jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
    Circle: () => null,
    Path: () => null,
  }
})

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ line: 'bnsf' }),
}))

jest.mock('../../lib/hooks', () => ({
  useLine: jest.fn(),
  useLineStations: jest.fn(),
}))

const mockUseLine = useLine as jest.MockedFunction<typeof useLine>
const mockUseLineStations = useLineStations as jest.MockedFunction<typeof useLineStations>

describe('MetraLineDetailScreen', () => {
  it('shows loading state while the line is loading', () => {
    mockUseLine.mockReturnValue({ line: null, loading: true })
    mockUseLineStations.mockReturnValue({ stations: [], loading: true })
    render(<MetraLineDetailScreen />)
    expect(screen.queryByText('BNSF Railway')).toBeNull()
  })

  it('renders the line header and station list once data is loaded', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    expect(screen.getByText('BNSF Railway')).toBeOnTheScreen()
    expect(screen.getByText('Union Station — Aurora')).toBeOnTheScreen()
    // "Aurora" appears in the header terminus label and as the station name
    expect(screen.getAllByText('Aurora').length).toBeGreaterThanOrEqual(1)
  })
})
