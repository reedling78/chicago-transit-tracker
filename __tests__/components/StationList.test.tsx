import { render, screen } from '@testing-library/react'
import StationList from '@/app/components/StationList'
import { mockStation } from '../fixtures'
import type { Station } from '@/app/lib/types'

const transferStation: Station = {
  ...mockStation,
  slug: 'transfer-station',
  name: 'Transfer Station',
  lines: ['Red', 'Blue'],
  accessibility: { ada: true, elevator: false, escalator: false },
}

const terminalStation: Station = {
  ...mockStation,
  slug: 'howard',
  name: 'Howard',
  lines: ['Red'],
  terminal: true,
  accessibility: { ada: false, elevator: false, escalator: false },
}

describe('StationList', () => {
  it('renders the Stations heading with count', () => {
    render(
      <StationList
        stations={[mockStation]}
        lineColor="#c60c30"
        stationHrefPrefix="/cta/red"
        currentLine="Red"
      />,
    )
    expect(screen.getByText('Stations')).toBeInTheDocument()
    expect(screen.getByText('(1)')).toBeInTheDocument()
  })

  it('renders each station name as a link', () => {
    render(
      <StationList
        stations={[mockStation]}
        lineColor="#c60c30"
        stationHrefPrefix="/cta/red"
        currentLine="Red"
      />,
    )
    expect(screen.getByRole('link', { name: /clark\/lake/i })).toBeInTheDocument()
  })

  it('link href includes the station slug', () => {
    render(
      <StationList
        stations={[mockStation]}
        lineColor="#c60c30"
        stationHrefPrefix="/cta/red"
        currentLine="Red"
      />,
    )
    const link = screen.getByRole('link', { name: /clark\/lake/i })
    expect(link).toHaveAttribute('href', '/cta/red/clark-lake')
  })

  it('renders ADA icon for accessible stations', () => {
    render(
      <StationList
        stations={[mockStation]}
        lineColor="#c60c30"
        stationHrefPrefix="/cta/red"
        currentLine="Red"
      />,
    )
    expect(screen.getByLabelText('ADA Accessible')).toBeInTheDocument()
  })

  it('does not render ADA icon for non-accessible stations', () => {
    render(
      <StationList
        stations={[terminalStation]}
        lineColor="#c60c30"
        stationHrefPrefix="/cta/red"
        currentLine="Red"
      />,
    )
    expect(screen.queryByLabelText('ADA Accessible')).not.toBeInTheDocument()
  })

  it('renders transfer line chips excluding currentLine', () => {
    render(
      <StationList
        stations={[transferStation]}
        lineColor="#c60c30"
        stationHrefPrefix="/cta/red"
        currentLine="Red"
      />,
    )
    // Blue should appear as a transfer chip; Red (currentLine) should not
    expect(screen.getByText('Blue')).toBeInTheDocument()
    expect(screen.queryByText('Red')).not.toBeInTheDocument()
  })

  it('renders multiple stations', () => {
    render(
      <StationList
        stations={[mockStation, terminalStation]}
        lineColor="#c60c30"
        stationHrefPrefix="/cta/red"
        currentLine="Red"
      />,
    )
    expect(screen.getByText('(2)')).toBeInTheDocument()
    expect(screen.getByText('Clark/Lake')).toBeInTheDocument()
    expect(screen.getByText('Howard')).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <StationList
        stations={[mockStation, terminalStation]}
        lineColor="#c60c30"
        stationHrefPrefix="/cta/red"
        currentLine="Red"
      />,
    )
    expect(container).toMatchSnapshot()
  })
})
