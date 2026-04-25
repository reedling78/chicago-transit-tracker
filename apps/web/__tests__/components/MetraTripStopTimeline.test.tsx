import { render, screen } from '@testing-library/react'
import MetraTripStopTimeline from '@components/MetraTripStopTimeline'
import type { DerivedStop } from '@lib/metra-status'

const LINE_COLOR = '#005baa'

function makeStop(
  overrides: Partial<DerivedStop> & {
    sequence?: number
    stationName?: string
    slug?: string | null
    arrival?: string
    departure?: string
  } = {},
): DerivedStop {
  const {
    sequence = 1,
    stationName = 'Aurora',
    slug = 'aurora',
    arrival = '5:30 AM',
    departure = '5:30 AM',
    ...rest
  } = overrides
  return {
    stop: { sequence, stationName, slug, arrival, departure },
    status: 'upcoming',
    delayMinutes: null,
    skipped: false,
    etaEpoch: null,
    ...rest,
  }
}

const baseStops: DerivedStop[] = [
  makeStop({
    sequence: 1,
    stationName: 'Aurora',
    slug: 'aurora',
    arrival: '5:30 AM',
    departure: '5:30 AM',
  }),
  makeStop({
    sequence: 2,
    stationName: 'Naperville',
    slug: 'naperville',
    arrival: '5:45 AM',
    departure: '5:46 AM',
  }),
  makeStop({
    sequence: 3,
    stationName: 'Downers Grove',
    slug: 'downers-grove',
    arrival: '6:00 AM',
    departure: '6:01 AM',
  }),
  makeStop({
    sequence: 4,
    stationName: 'Union Station',
    slug: 'union-station',
    arrival: '6:30 AM',
    departure: '6:30 AM',
  }),
]

describe('MetraTripStopTimeline', () => {
  it('renders one row per stop with data-stop-sequence', () => {
    const { container } = render(
      <MetraTripStopTimeline derivedStops={baseStops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )

    const rows = container.querySelectorAll('[data-stop-sequence]')
    expect(rows.length).toBe(4)
    expect(rows[0].getAttribute('data-stop-sequence')).toBe('1')
    expect(rows[3].getAttribute('data-stop-sequence')).toBe('4')
  })

  it('renders every station name', () => {
    render(
      <MetraTripStopTimeline derivedStops={baseStops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    expect(screen.getByText('Aurora')).toBeInTheDocument()
    expect(screen.getByText('Naperville')).toBeInTheDocument()
    expect(screen.getByText('Downers Grove')).toBeInTheDocument()
    expect(screen.getByText('Union Station')).toBeInTheDocument()
  })

  it('links station names to /metra/{lineSlug}/{slug} when slug is present', () => {
    render(
      <MetraTripStopTimeline derivedStops={baseStops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    const link = screen.getByRole('link', { name: /aurora/i })
    expect(link).toHaveAttribute('href', '/metra/bnsf/aurora')
  })

  it('renders station name as plain text when slug is null', () => {
    const stops: DerivedStop[] = [
      makeStop({ sequence: 1, stationName: 'Whistle Stop', slug: null }),
    ]
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />)
    expect(screen.getByText('Whistle Stop')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /whistle stop/i })).not.toBeInTheDocument()
  })

  it('renders the departure time on each row (not the arrival) when they differ', () => {
    render(
      <MetraTripStopTimeline derivedStops={baseStops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    // Naperville: arrival 5:45, departure 5:46 — we render departure
    expect(screen.getByText('5:46 AM')).toBeInTheDocument()
    expect(screen.queryByText('5:45 AM')).not.toBeInTheDocument()
    // Downers Grove: arrival 6:00, departure 6:01 — we render departure
    expect(screen.getByText('6:01 AM')).toBeInTheDocument()
    expect(screen.queryByText('6:00 AM')).not.toBeInTheDocument()
  })

  it('renders the "Next stop" pill for the current stop', () => {
    const stops = baseStops.map((d, i): DerivedStop => {
      if (i === 2) return { ...d, status: 'current' }
      if (i < 2) return { ...d, status: 'past' }
      return d
    })
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />)
    expect(screen.getByText('Next stop')).toBeInTheDocument()
  })

  it('tints the current stop row with the line color', () => {
    const stops = baseStops.map((d, i): DerivedStop => {
      if (i === 2) return { ...d, status: 'current' }
      if (i < 2) return { ...d, status: 'past' }
      return d
    })
    const { container } = render(
      <MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    const currentRow = container.querySelector(
      '[data-steps-status="current"]',
    ) as HTMLElement | null
    expect(currentRow).not.toBeNull()
    // 8% alpha tint applied as inline style
    expect(currentRow!.style.backgroundColor).not.toBe('')
    expect(currentRow!.className).not.toContain('border-l-4')
  })

  it('renders the current stop bullet with data-steps-bullet="halo"', () => {
    const stops = baseStops.map((d, i): DerivedStop => {
      if (i === 2) return { ...d, status: 'current' }
      if (i < 2) return { ...d, status: 'past' }
      return d
    })
    const { container } = render(
      <MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    const currentRow = container.querySelector('[data-stop-sequence="3"]') as HTMLElement
    const bullet = currentRow.querySelector('[data-steps-bullet]') as HTMLElement | null
    expect(bullet).not.toBeNull()
    expect(bullet!.getAttribute('data-steps-bullet')).toBe('halo')
  })

  it('renders non-current stop bullets with data-steps-bullet="open"', () => {
    const stops = baseStops.map((d, i): DerivedStop => {
      if (i === 2) return { ...d, status: 'current' }
      if (i < 2) return { ...d, status: 'past' }
      return d
    })
    const { container } = render(
      <MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    // past stops (index 0 and 1) and upcoming stops (index 3) should be 'open'
    const pastRow0 = container.querySelector('[data-stop-sequence="1"]') as HTMLElement
    const pastRow1 = container.querySelector('[data-stop-sequence="2"]') as HTMLElement
    const upcomingRow = container.querySelector('[data-stop-sequence="4"]') as HTMLElement
    expect(pastRow0.querySelector('[data-steps-bullet]')!.getAttribute('data-steps-bullet')).toBe(
      'open',
    )
    expect(pastRow1.querySelector('[data-steps-bullet]')!.getAttribute('data-steps-bullet')).toBe(
      'open',
    )
    expect(
      upcomingRow.querySelector('[data-steps-bullet]')!.getAttribute('data-steps-bullet'),
    ).toBe('open')
  })

  it('renders the "Next stop" pill alongside the departure time in the trailing slot', () => {
    const stops = baseStops.map((d, i): DerivedStop => {
      if (i === 2) return { ...d, status: 'current' }
      if (i < 2) return { ...d, status: 'past' }
      return d
    })
    const { container } = render(
      <MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    const currentRow = container.querySelector('[data-stop-sequence="3"]') as HTMLElement
    expect(currentRow.textContent).toContain('Next stop')
    expect(currentRow.textContent).toContain('6:01 AM')
  })

  it('renders the "Skipped" pill on skipped rows', () => {
    const stops: DerivedStop[] = [
      makeStop({ sequence: 1 }),
      {
        ...makeStop({ sequence: 2, stationName: 'Naperville', slug: 'naperville' }),
        skipped: true,
      },
    ]
    const { container } = render(
      <MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    const skippedRow = container.querySelector('[data-stop-sequence="2"]') as HTMLElement
    expect(skippedRow.textContent).toContain('Skipped')
  })

  it('renders "Skipped" pill and line-through on skipped stops', () => {
    const stops: DerivedStop[] = [
      makeStop({ sequence: 1 }),
      {
        ...makeStop({ sequence: 2, stationName: 'Naperville', slug: 'naperville' }),
        skipped: true,
      },
      makeStop({ sequence: 3, stationName: 'Downers Grove', slug: 'downers-grove' }),
      makeStop({ sequence: 4, stationName: 'Union Station', slug: 'union-station' }),
    ]
    const { container } = render(
      <MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    expect(screen.getByText('Skipped')).toBeInTheDocument()
    // line-through is applied to the data-steps-left container wrapping the skipped station name
    const skippedRow = container.querySelector('[data-stop-sequence="2"]') as HTMLElement
    const leftSlot = skippedRow.querySelector('[data-steps-left]') as HTMLElement | null
    expect(leftSlot).not.toBeNull()
    expect(leftSlot!.className).toContain('line-through')
    // The row itself gets opacity-60
    expect(skippedRow.className).toContain('opacity-60')
  })

  it('renders a red +N min delay chip when delayMinutes > 0', () => {
    const stops: DerivedStop[] = [
      makeStop({ sequence: 1 }),
      {
        ...makeStop({ sequence: 2, stationName: 'Naperville', slug: 'naperville' }),
        delayMinutes: 4,
      },
    ]
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />)
    expect(screen.getByText('+4 min')).toBeInTheDocument()
  })

  it('renders a green early chip when delayMinutes < 0', () => {
    const stops: DerivedStop[] = [
      makeStop({ sequence: 1 }),
      {
        ...makeStop({ sequence: 2, stationName: 'Naperville', slug: 'naperville' }),
        delayMinutes: -2,
      },
    ]
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />)
    expect(screen.getByText('-2 min')).toBeInTheDocument()
  })

  it('does not render a delay chip on skipped stops even when delayMinutes is set', () => {
    const stops: DerivedStop[] = [
      makeStop({ sequence: 1 }),
      {
        ...makeStop({ sequence: 2, stationName: 'Naperville', slug: 'naperville' }),
        delayMinutes: 4,
        skipped: true,
      },
    ]
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />)
    expect(screen.queryByText('+4 min')).not.toBeInTheDocument()
  })

  it('applies opacity-60 to past stops', () => {
    const stops = baseStops.map((d, i): DerivedStop => (i < 2 ? { ...d, status: 'past' } : d))
    const { container } = render(
      <MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    const pastRow = container.querySelector('[data-stop-sequence="1"]') as HTMLElement
    expect(pastRow.className).toContain('opacity-60')
  })

  it('applies opacity-60 to skipped stops', () => {
    const stops: DerivedStop[] = [
      makeStop({ sequence: 1 }),
      {
        ...makeStop({ sequence: 2, stationName: 'Naperville', slug: 'naperville' }),
        skipped: true,
      },
    ]
    const { container } = render(
      <MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
    )
    const skippedRow = container.querySelector('[data-stop-sequence="2"]') as HTMLElement
    expect(skippedRow.className).toContain('opacity-60')
  })
})
