jest.mock('firebase-admin/firestore', () => {
  const mockBatch = {
    set: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  }
  const mockCollection = jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({ ref: 'mock-ref' }),
  })
  return {
    getFirestore: jest.fn().mockReturnValue({
      batch: jest.fn().mockReturnValue(mockBatch),
      collection: mockCollection,
    }),
  }
})

import { batchWrite } from '@functions/lib/firestore-writer'
import { getFirestore } from 'firebase-admin/firestore'

const mockDb = getFirestore() as unknown as {
  batch: jest.Mock
  collection: jest.Mock
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('batchWrite', () => {
  it('writes documents in a single batch when under 500', async () => {
    const docs = new Map<string, Record<string, unknown>>()
    docs.set('doc1', { name: 'Test 1' })
    docs.set('doc2', { name: 'Test 2' })

    const count = await batchWrite('schedules', docs)

    expect(count).toBe(2)
    expect(mockDb.batch).toHaveBeenCalledTimes(1)
    const batch = mockDb.batch()
    expect(batch.set).toHaveBeenCalledTimes(2)
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })

  it('chunks writes into batches of 100', async () => {
    const docs = new Map<string, Record<string, unknown>>()
    for (let i = 0; i < 250; i++) {
      docs.set(`doc${i}`, { index: i })
    }

    // Reset call counts from the mock setup
    mockDb.batch.mockClear()
    const mockBatch = { set: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }
    mockDb.batch.mockReturnValue(mockBatch)

    const count = await batchWrite('schedules', docs)

    expect(count).toBe(250)
    // 250 / 100 = 3 batches
    expect(mockDb.batch).toHaveBeenCalledTimes(3)
  })

  it('returns 0 for empty input', async () => {
    const docs = new Map<string, Record<string, unknown>>()
    const count = await batchWrite('schedules', docs)
    expect(count).toBe(0)
  })
})
