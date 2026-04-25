import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@components/dashboard/DashboardHeader', () => {
  return function MockHeader() {
    return <div data-testid="dash-header" />
  }
})
jest.mock('@components/dashboard/FavoriteTrains', () => {
  return function MockTrains() {
    return <div data-testid="dash-trains" />
  }
})
jest.mock('@components/dashboard/FavoriteStations', () => {
  return function MockStations() {
    return <div data-testid="dash-stations" />
  }
})
jest.mock('@components/dashboard/FavoriteLines', () => {
  return function MockLines() {
    return <div data-testid="dash-lines" />
  }
})
jest.mock('@components/Hero', () => {
  return function MockHero() {
    return <div data-testid="dash-hero" />
  }
})

import Dashboard from '@components/dashboard/Dashboard'

describe('Dashboard', () => {
  it('renders all dashboard sections in the personal-first order', () => {
    const { container } = render(<Dashboard />)
    const ids = Array.from(container.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    )
    expect(ids).toEqual(['dash-header', 'dash-trains', 'dash-stations', 'dash-lines', 'dash-hero'])
    expect(screen.getByTestId('dash-trains')).toBeInTheDocument()
  })
})
