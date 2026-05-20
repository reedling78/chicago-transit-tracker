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
jest.mock('@components/dashboard/DashboardItemsList', () => {
  return function MockDashboardItemsList() {
    return <div data-testid="dash-items-list" />
  }
})

import Dashboard from '@components/dashboard/Dashboard'

describe('Dashboard', () => {
  it('renders header, then grid + items list two-column, then Hero', () => {
    const { container } = render(<Dashboard />)
    const ids = Array.from(container.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    )
    expect(ids).toEqual(['dash-header', 'dash-grid', 'dash-items-list', 'dash-hero'])
    expect(screen.getByTestId('dash-header')).toBeInTheDocument()
    expect(screen.getByTestId('dash-grid')).toBeInTheDocument()
    expect(screen.getByTestId('dash-items-list')).toBeInTheDocument()
    expect(screen.getByTestId('dash-hero')).toBeInTheDocument()
  })

  it('uses a two-column grid at lg breakpoint', () => {
    const { container } = render(<Dashboard />)
    expect(container.querySelector('.lg\\:grid-cols-\\[3fr_2fr\\]')).not.toBeNull()
  })
})
