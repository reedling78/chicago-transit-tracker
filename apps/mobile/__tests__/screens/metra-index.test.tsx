import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { mockMetraLine } from '../fixtures'
import { useLines } from '../../lib/hooks'
import MetraLinesScreen from '../../app/metra/index'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return {
    LinearGradient: (props: any) => <View {...props} />,
  }
})

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('../../lib/hooks', () => ({
  useLines: jest.fn(),
  useAlerts: jest
    .fn()
    .mockReturnValue({ alerts: [], loading: false, error: null, retry: jest.fn() }),
}))

const mockUseLines = useLines as jest.MockedFunction<typeof useLines>

describe('MetraLinesScreen', () => {
  it('renders nothing interesting while loading', () => {
    mockUseLines.mockReturnValue({ lines: [], loading: true })
    render(<MetraLinesScreen />)
    expect(screen.queryByText('BNSF Railway')).toBeNull()
  })

  it('renders a card per metra line once data has loaded', () => {
    mockUseLines.mockReturnValue({ lines: [mockMetraLine], loading: false })
    render(<MetraLinesScreen />)
    expect(screen.getByText('BNSF Railway')).toBeOnTheScreen()
    expect(screen.getByText('Union Station — Aurora')).toBeOnTheScreen()
    expect(screen.queryByText(/stations/)).toBeNull()
  })

  it('renders the PageHeader with Metra title and description', () => {
    mockUseLines.mockReturnValue({ lines: [mockMetraLine], loading: false })
    render(<MetraLinesScreen />)
    expect(screen.getByText('Metra Lines')).toBeOnTheScreen()
    expect(
      screen.getByText(
        '11 commuter rail lines connecting Chicago to the suburbs across 6 counties.',
      ),
    ).toBeOnTheScreen()
  })

  it('renders a Service Alerts link', () => {
    mockUseLines.mockReturnValue({ lines: [mockMetraLine], loading: false })
    render(<MetraLinesScreen />)
    expect(screen.getByText('Service Alerts')).toBeOnTheScreen()
  })
})
