import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import HomeScreen from '../../app/index'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

describe('HomeScreen', () => {
  it('renders the title, subtitle, and service cards', () => {
    render(<HomeScreen />)
    expect(screen.getByText('Chicago Transit Tracker')).toBeOnTheScreen()
    expect(screen.getByText('Explore CTA and Metra transit lines and stations')).toBeOnTheScreen()
    expect(screen.getByText('CTA')).toBeOnTheScreen()
    expect(screen.getByText('Metra')).toBeOnTheScreen()
    expect(screen.getByText('Rapid Transit Lines')).toBeOnTheScreen()
    expect(screen.getByText('Commuter Rail Lines')).toBeOnTheScreen()
  })
})
