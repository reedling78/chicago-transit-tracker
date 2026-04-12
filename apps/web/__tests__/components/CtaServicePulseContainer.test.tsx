import { act, render, screen, waitFor } from '@testing-library/react'
import CtaServicePulseContainer from '@components/CtaServicePulseContainer'
import { fetchCtaTrainLocations } from '@lib/cta-train-tracker'
import { fetchCTAAlerts } from '@lib/cta-alerts'
import type { Line } from '@lib/types'

jest.mock('@lib/cta-train-tracker')
jest.mock('@lib/cta-alerts')

const mockFetchLocations = fetchCtaTrainLocations as jest.MockedFunction<
  typeof fetchCtaTrainLocations
>
const mockFetchAlerts = fetchCTAAlerts as jest.MockedFunction<typeof fetchCTAAlerts>

const redLine: Line = {
  id: 'red',
  name: 'Red Line',
  shortName: 'Red',
  slug: 'red',
  service: 'cta',
  color: '#c60c30',
  textColor: '#ffffff',
  termini: ['Howard', '95th/Dan Ryan'],
  stationCount: 33,
  routeMiles: 23,
  operatesOvernight: true,
  peakFrequencyMins: 6,
  offPeakFrequencyMins: 10,
  firstTrainApprox: null,
  lastTrainApprox: null,
  type: 'rapid_transit',
  description: '',
  ctaRouteId: 'Red',
  metraLineCode: null,
  downtownTerminal: null,
  operator: null,
  countiesServed: [],
  photoUrl: null,
  scheduleUrl: null,
}

function mkTrain(overrides: {
  rn: string
  destNm: string
  nextStaNm?: string
  arrT?: string
  isDly?: '0' | '1'
}) {
  return {
    rn: overrides.rn,
    destSt: '0',
    destNm: overrides.destNm,
    trDr: '1',
    nextStaId: '0',
    nextStaNm: overrides.nextStaNm ?? 'Clark/Lake',
    prdt: '2026-04-11T08:00:00',
    arrT: overrides.arrT ?? '2026-04-11T08:05:00',
    isApp: '0' as const,
    isDly: overrides.isDly ?? ('0' as const),
    lat: '0',
    lon: '0',
    heading: '0',
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
      'performance',
    ],
    now: new Date('2026-04-11T08:00:00'),
  })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('CtaServicePulseContainer', () => {
  it('polls train-locations and alerts and renders one card per terminal', async () => {
    mockFetchLocations.mockResolvedValue({
      ctatt: {
        route: [
          {
            '@name': 'red',
            train: [
              mkTrain({ rn: '1', destNm: 'Howard' }),
              mkTrain({ rn: '2', destNm: 'Howard' }),
              mkTrain({ rn: '3', destNm: 'Howard' }),
              mkTrain({ rn: '4', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '5', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '6', destNm: '95th/Dan Ryan' }),
            ],
          },
        ],
      },
    })
    mockFetchAlerts.mockResolvedValue([])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-Howard')).toBeInTheDocument()
    })
    expect(screen.getByTestId('pulse-card-95th/Dan Ryan')).toBeInTheDocument()
    expect(mockFetchLocations).toHaveBeenCalledWith('red')
    expect(mockFetchAlerts).toHaveBeenCalledWith('Red')
  })

  it('marks the card minor when any train has isDly=1', async () => {
    mockFetchLocations.mockResolvedValue({
      ctatt: {
        route: [
          {
            '@name': 'red',
            train: [
              mkTrain({ rn: '1', destNm: 'Howard', isDly: '1' }),
              mkTrain({ rn: '2', destNm: 'Howard' }),
              mkTrain({ rn: '3', destNm: 'Howard' }),
              mkTrain({ rn: '4', destNm: '95th/Dan Ryan' }),
            ],
          },
        ],
      },
    })
    mockFetchAlerts.mockResolvedValue([])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-Howard')).toHaveAttribute('data-tone', 'minor')
    })
  })

  it('bumps health to minor when a high-severity alert exists for the line', async () => {
    mockFetchLocations.mockResolvedValue({
      ctatt: {
        route: [
          {
            '@name': 'red',
            train: [
              mkTrain({ rn: '1', destNm: 'Howard' }),
              mkTrain({ rn: '2', destNm: 'Howard' }),
              mkTrain({ rn: '3', destNm: 'Howard' }),
              mkTrain({ rn: '4', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '5', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '6', destNm: '95th/Dan Ryan' }),
            ],
          },
        ],
      },
    })
    mockFetchAlerts.mockResolvedValue([
      {
        AlertId: 'A1',
        Headline: 'Major delay',
        ShortDescription: 'Trains stopped',
        FullDescription: { '#cdata-section': '' },
        SeverityScore: '70',
        SeverityColor: '',
        SeverityCSS: '',
        Impact: '',
        EventStart: '',
        EventEnd: null,
        TBD: '',
        MajorAlert: '1',
        AlertURL: { '#cdata-section': '' },
        ImpactedService: {
          Service: {
            ServiceType: '',
            ServiceTypeDescription: '',
            ServiceName: 'Red Line',
            ServiceId: 'Red',
            ServiceBackColor: '',
            ServiceTextColor: '',
            ServiceURL: { '#cdata-section': '' },
          },
        },
      },
    ])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-Howard')).toHaveAttribute('data-tone', 'minor')
    })
    expect(screen.getByText(/Alert:/)).toBeInTheDocument()
  })

  it('renders an empty state when the train-locations call errors', async () => {
    mockFetchLocations.mockRejectedValue(new Error('Network down'))
    mockFetchAlerts.mockResolvedValue([])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByText(/Live service data unavailable/)).toBeInTheDocument()
    })
  })

  it('renders nodata tone on each direction card when the initial fetch errors', async () => {
    mockFetchLocations.mockRejectedValue(new Error('Network down'))
    mockFetchAlerts.mockResolvedValue([])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-Howard')).toHaveAttribute('data-tone', 'nodata')
    })
    expect(screen.getByTestId('pulse-card-95th/Dan Ryan')).toHaveAttribute('data-tone', 'nodata')
  })

  it('does not bump health when a non-major alert is present (MajorAlert=0)', async () => {
    mockFetchLocations.mockResolvedValue({
      ctatt: {
        route: [
          {
            '@name': 'red',
            train: [
              mkTrain({ rn: '1', destNm: 'Howard' }),
              mkTrain({ rn: '2', destNm: 'Howard' }),
              mkTrain({ rn: '3', destNm: 'Howard' }),
              mkTrain({ rn: '4', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '5', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '6', destNm: '95th/Dan Ryan' }),
            ],
          },
        ],
      },
    })
    mockFetchAlerts.mockResolvedValue([
      {
        AlertId: 'A2',
        Headline: 'Elevator out',
        ShortDescription: '',
        FullDescription: { '#cdata-section': '' },
        SeverityScore: '70',
        SeverityColor: '',
        SeverityCSS: '',
        Impact: '',
        EventStart: '',
        EventEnd: null,
        TBD: '',
        MajorAlert: '0',
        AlertURL: { '#cdata-section': '' },
        ImpactedService: {
          Service: {
            ServiceType: '',
            ServiceTypeDescription: '',
            ServiceName: 'Red Line',
            ServiceId: 'Red',
            ServiceBackColor: '',
            ServiceTextColor: '',
            ServiceURL: { '#cdata-section': '' },
          },
        },
      },
    ])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-Howard')).toHaveAttribute('data-tone', 'normal')
    })
  })

  it('re-fetches when the tab regains visibility', async () => {
    mockFetchLocations.mockResolvedValue({
      ctatt: { route: [{ '@name': 'red', train: [] }] },
    })
    mockFetchAlerts.mockResolvedValue([])
    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(mockFetchLocations).toHaveBeenCalled()
    })
    mockFetchLocations.mockClear()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => {
      expect(mockFetchLocations).toHaveBeenCalled()
    })
  })
})
