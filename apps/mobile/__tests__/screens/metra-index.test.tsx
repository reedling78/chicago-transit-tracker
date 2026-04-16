import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { mockMetraLine } from '../fixtures'
import { useLines } from '../../lib/hooks'
import MetraLinesScreen from '../../app/metra/index'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

jest.mock('../../lib/hooks', () => ({
  useLines: jest.fn(),
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
})
