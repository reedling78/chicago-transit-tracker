import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@components/Hero', () => {
  return function MockHero() {
    return <div data-testid="dash-hero" />
  }
})
jest.mock('@components/dashboard/DashboardHeader', () => {
  return function MockDashboardHeader() {
    return <div data-testid="dash-header" />
  }
})
jest.mock('@components/dashboard/DashboardGrid', () => {
  return function MockDashboardGrid() {
    return <div data-testid="dash-grid" />
  }
})

import Dashboard from '@components/dashboard/Dashboard'

describe('Dashboard', () => {
  it('renders header, grid, then service-cards Hero in order', () => {
    const { container } = render(<Dashboard />)
    const ids = Array.from(container.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    )
    expect(ids).toEqual(['dash-header', 'dash-grid', 'dash-hero'])
    expect(screen.getByTestId('dash-header')).toBeInTheDocument()
    expect(screen.getByTestId('dash-grid')).toBeInTheDocument()
    expect(screen.getByTestId('dash-hero')).toBeInTheDocument()
  })
})
