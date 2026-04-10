import { render, screen } from '@testing-library/react'

const mockTripDetail = {
  tripId: 'bnsf_bn1234',
  trainNumber: '1234',
  headsign: 'Chicago Union Station',
  line: 'BNSF',
  lineSlug: 'bnsf',
  lineName: 'BNSF Railway Line',
  serviceType: 'weekday',
  directionId: 0,
  stops: [
    {
      sequence: 1,
      stationName: 'Aurora',
      slug: 'aurora',
      arrival: '5:30 AM',
      departure: '5:30 AM',
    },
    {
      sequence: 2,
      stationName: 'Naperville',
      slug: 'naperville',
      arrival: '5:45 AM',
      departure: '5:46 AM',
    },
  ],
}

const mockGetDoc = jest.fn()

jest.mock('@lib/firebase-admin', () => ({
  getFirestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: (...args: unknown[]) => mockGetDoc(...args),
      }),
    }),
  }),
}))

jest.mock('@lib/transit', () => ({
  getLinesForService: jest.fn().mockResolvedValue([{ slug: 'bnsf', shortName: 'BNSF' }]),
}))

import MetraTripPage from '@/app/metra/[line]/train/[tripId]/page'

describe('Metra train detail page', () => {
  it('renders the train number and stops', async () => {
    mockGetDoc.mockResolvedValue({ exists: true, data: () => mockTripDetail })

    const params = Promise.resolve({ line: 'bnsf', tripId: 'bnsf_bn1234' })
    const ui = await MetraTripPage({ params })
    render(ui)

    expect(screen.getByRole('heading', { name: 'Train 1234' })).toBeInTheDocument()
    expect(screen.getByText('Aurora')).toBeInTheDocument()
    expect(screen.getByText('Naperville')).toBeInTheDocument()
  })

  it('uses the Metra hero background image', async () => {
    mockGetDoc.mockResolvedValue({ exists: true, data: () => mockTripDetail })

    const params = Promise.resolve({ line: 'bnsf', tripId: 'bnsf_bn1234' })
    const ui = await MetraTripPage({ params })
    const { container } = render(ui)
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toContain('hero-header-metra.jpg')
  })

  it('renders not found when trip does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: false })

    const params = Promise.resolve({ line: 'bnsf', tripId: 'nonexistent' })
    const ui = await MetraTripPage({ params })
    render(ui)

    expect(screen.getByText('Train not found.')).toBeInTheDocument()
  })
})
