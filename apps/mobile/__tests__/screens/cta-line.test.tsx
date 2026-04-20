import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { mockLine, mockStation } from '../fixtures'
import { useLine, useLineStations } from '../../lib/hooks'
import CtaLineDetailScreen from '../../app/(tabs)/cta/[line]'

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
  useLocalSearchParams: () => ({ line: 'red' }),
}))

jest.mock('../../lib/hooks', () => ({
  useLine: jest.fn(),
  useLineStations: jest.fn(),
}))

const mockUseLine = useLine as jest.MockedFunction<typeof useLine>
const mockUseLineStations = useLineStations as jest.MockedFunction<typeof useLineStations>

describe('CtaLineDetailScreen', () => {
  it('shows loading state while the line is loading', () => {
    mockUseLine.mockReturnValue({ line: null, loading: true })
    mockUseLineStations.mockReturnValue({ stations: [], loading: true })
    render(<CtaLineDetailScreen />)
    expect(screen.queryByText('Red Line')).toBeNull()
  })

  it('renders the line header and station list once data is loaded', () => {
    mockUseLine.mockReturnValue({ line: mockLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockStation], loading: false })
    render(<CtaLineDetailScreen />)
    expect(screen.getByText('Red Line')).toBeOnTheScreen()
    expect(screen.getByText('Howard — 95th/Dan Ryan')).toBeOnTheScreen()
    expect(screen.getByText('Clark/Lake')).toBeOnTheScreen()
  })
})
