import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { mockLine } from '../fixtures'
import { useLines } from '../../lib/hooks'
import CtaLinesScreen from '../../app/cta/index'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

jest.mock('../../lib/hooks', () => ({
  useLines: jest.fn(),
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
})
