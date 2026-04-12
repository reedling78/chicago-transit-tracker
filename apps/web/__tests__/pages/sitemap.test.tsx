import { render, screen, within } from '@testing-library/react'
import {
  mockLine,
  mockMetraLine,
  mockStation,
  mockMetraStation,
  mockPaceRoute,
  mockPacePulseRoute,
} from '../fixtures'
import type { Line, Station } from '@lib/types'

jest.mock('@lib/transit', () => ({
  getLinesForService: jest.fn(),
  getStationsForLine: jest.fn(),
}))

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
}))

import { getLinesForService, getStationsForLine } from '@lib/transit'
import { getAllPaceRoutes } from '@lib/pace'
import SitemapPage from '@/app/sitemap/page'

const mockedGetLinesForService = getLinesForService as jest.MockedFunction<
  typeof getLinesForService
>
const mockedGetStationsForLine = getStationsForLine as jest.MockedFunction<
  typeof getStationsForLine
>
const mockedGetAllPaceRoutes = getAllPaceRoutes as jest.MockedFunction<typeof getAllPaceRoutes>

describe('SitemapPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockedGetLinesForService.mockImplementation(
      async (service: 'cta' | 'metra'): Promise<Line[]> => {
        if (service === 'cta') return [mockLine]
        return [mockMetraLine]
      },
    )

    mockedGetStationsForLine.mockImplementation(async (shortName: string): Promise<Station[]> => {
      if (shortName === 'Red') return [mockStation]
      if (shortName === 'BNSF') return [mockMetraStation]
      return []
    })

    mockedGetAllPaceRoutes.mockResolvedValue([mockPaceRoute, mockPacePulseRoute])
  })

  it('renders the main section headings', async () => {
    const ui = await SitemapPage()
    render(ui)
    expect(screen.getByRole('heading', { name: 'Pages', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'CTA Rail', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Metra', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pace Bus', level: 2 })).toBeInTheDocument()
  })

  it('renders top-level page links', async () => {
    const ui = await SitemapPage()
    render(ui)
    const pages = within(screen.getByRole('region', { name: 'Pages' }))
    expect(pages.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(pages.getByRole('link', { name: 'CTA Rail' })).toHaveAttribute('href', '/cta')
    expect(pages.getByRole('link', { name: 'CTA Alerts' })).toHaveAttribute('href', '/cta/alerts')
    expect(pages.getByRole('link', { name: 'Metra' })).toHaveAttribute('href', '/metra')
    expect(pages.getByRole('link', { name: 'Metra Alerts' })).toHaveAttribute(
      'href',
      '/metra/alerts',
    )
    expect(pages.getByRole('link', { name: 'Pace Bus' })).toHaveAttribute('href', '/pace')
    expect(pages.getByRole('link', { name: 'Pace Pulse' })).toHaveAttribute('href', '/pace/pulse')
    expect(pages.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms')
    expect(pages.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
  })

  it('renders each CTA line heading and at least one station link', async () => {
    const ui = await SitemapPage()
    render(ui)
    expect(screen.getByRole('heading', { name: 'Red Line', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clark/Lake' })).toHaveAttribute(
      'href',
      '/cta/red/clark-lake',
    )
  })

  it('renders each Metra line heading and at least one station link', async () => {
    const ui = await SitemapPage()
    render(ui)
    expect(screen.getByRole('heading', { name: 'BNSF Railway', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Aurora' })).toHaveAttribute(
      'href',
      '/metra/bnsf/aurora',
    )
  })

  it('renders every Pace route link and no individual Pace stops', async () => {
    const ui = await SitemapPage()
    render(ui)
    expect(screen.getByRole('link', { name: /208.*Golf Road/ })).toHaveAttribute(
      'href',
      '/pace/208',
    )
    expect(screen.getByRole('link', { name: /Milwaukee Pulse.*Milwaukee Avenue/ })).toHaveAttribute(
      'href',
      '/pace/milwaukee-pulse',
    )
    expect(screen.queryByRole('link', { name: /Golf Rd & Waukegan Rd/ })).toBeNull()
  })
})
