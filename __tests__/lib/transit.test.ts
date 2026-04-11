/**
 * @jest-environment node
 */

jest.mock('@lib/firebase-admin', () => {
  const mockWhereGet = jest.fn()
  const mockWhere = jest.fn().mockReturnValue({ get: mockWhereGet })
  const mockCollection = jest.fn().mockReturnValue({ where: mockWhere })
  return {
    db: { collection: mockCollection },
    getFirestore: jest.fn().mockReturnValue({ collection: mockCollection }),
    __mocks: { mockWhereGet, mockWhere, mockCollection },
  }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('@lib/firebase-admin')
const { mockWhereGet, mockWhere, mockCollection } = __mocks

import { getMetraLineTrips } from '@lib/transit'

beforeEach(() => {
  mockWhereGet.mockReset()
  mockWhere.mockClear()
  mockCollection.mockClear()
})

describe('getMetraLineTrips', () => {
  it('queries metra-trips filtered by lineSlug and normalizes docs', async () => {
    mockWhereGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            trainNumber: '1274',
            headsign: 'Aurora',
            serviceType: 'weekday',
            directionId: 1,
            lineSlug: 'bnsf',
            stops: [
              {
                sequence: 1,
                stationName: 'Union Station',
                slug: 'union-station',
                arrival: '5:00 AM',
                departure: '5:00 AM',
              },
            ],
          }),
        },
        {
          data: () => ({
            trainNumber: '1286',
            headsign: 'Chicago',
            serviceType: 'weekday',
            directionId: 0,
            lineSlug: 'bnsf',
            stops: [],
          }),
        },
      ],
    })

    const result = await getMetraLineTrips('bnsf')

    expect(mockCollection).toHaveBeenCalledWith('metra-trips')
    expect(mockWhere).toHaveBeenCalledWith('lineSlug', '==', 'bnsf')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      trainNumber: '1274',
      headsign: 'Aurora',
      serviceType: 'weekday',
      directionId: 1,
      stops: [
        {
          sequence: 1,
          stationName: 'Union Station',
          slug: 'union-station',
          arrival: '5:00 AM',
          departure: '5:00 AM',
        },
      ],
    })
  })

  it('defaults directionId to 0 and stops to [] when missing', async () => {
    mockWhereGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            trainNumber: '9',
            headsign: 'X',
            serviceType: 'sunday',
          }),
        },
      ],
    })

    const result = await getMetraLineTrips('me')
    expect(result[0].directionId).toBe(0)
    expect(result[0].stops).toEqual([])
  })

  it('returns empty array when no docs match', async () => {
    mockWhereGet.mockResolvedValue({ docs: [] })
    const result = await getMetraLineTrips('bnsf')
    expect(result).toEqual([])
  })

  it('propagates Firestore errors to the caller', async () => {
    mockWhereGet.mockRejectedValue(new Error('PERMISSION_DENIED'))
    await expect(getMetraLineTrips('bnsf')).rejects.toThrow('PERMISSION_DENIED')
  })

  it('preserves stop fields even when optional fields are missing from the doc', async () => {
    mockWhereGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            trainNumber: '55',
            headsign: 'Somewhere',
            serviceType: 'saturday',
            stops: [
              {
                sequence: 1,
                stationName: 'Aurora',
                slug: null,
                arrival: '6:00 AM',
                departure: '6:00 AM',
              },
            ],
          }),
        },
      ],
    })
    const result = await getMetraLineTrips('bnsf')
    expect(result[0].stops[0].slug).toBeNull()
    expect(result[0].directionId).toBe(0)
  })
})
