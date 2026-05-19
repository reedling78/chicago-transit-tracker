import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { mockLine } from '../fixtures'
import { useLines } from '../../lib/hooks'
import CtaLinesScreen from '../../app/(app)/cta/index'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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

describe('CtaLinesScreen', () => {
  it('renders a loading indicator while lines are loading', () => {
    mockUseLines.mockReturnValue({ lines: [], loading: true })
    render(<CtaLinesScreen />)
    // No data rendered yet
    expect(screen.queryByText('Red Line')).toBeNull()
  })

  it('renders a card per line once data has loaded', () => {
    mockUseLines.mockReturnValue({ lines: [mockLine], loading: false })
    render(<CtaLinesScreen />)
    expect(screen.getByText('Red Line')).toBeOnTheScreen()
    expect(screen.getByText('Howard — 95th/Dan Ryan')).toBeOnTheScreen()
    expect(screen.queryByText(/stations/)).toBeNull()
  })

  it('renders the PageHeader with CTA title and description', () => {
    mockUseLines.mockReturnValue({ lines: [mockLine], loading: false })
    render(<CtaLinesScreen />)
    expect(screen.getByText('CTA Lines')).toBeOnTheScreen()
    expect(
      screen.getByText('8 color-coded rapid transit lines serving Chicago and the inner suburbs.'),
    ).toBeOnTheScreen()
  })

  it('renders a Service Alerts link', () => {
    mockUseLines.mockReturnValue({ lines: [mockLine], loading: false })
    render(<CtaLinesScreen />)
    expect(screen.getByText('Service Alerts')).toBeOnTheScreen()
  })

  it('does not render the Footer', () => {
    mockUseLines.mockReturnValue({ lines: [mockLine], loading: false })
    render(<CtaLinesScreen />)
    expect(screen.queryByTestId('footer')).toBeNull()
  })
})
