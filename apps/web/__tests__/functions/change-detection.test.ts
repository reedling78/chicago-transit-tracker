jest.mock('firebase-admin/firestore', () => {
  const mockSet = jest.fn().mockResolvedValue(undefined)
  const mockGet = jest.fn()
  const mockDoc = jest.fn().mockReturnValue({ get: mockGet, set: mockSet })
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc })
  return {
    getFirestore: jest.fn().mockReturnValue({ collection: mockCollection }),
    Timestamp: { now: jest.fn().mockReturnValue({ seconds: 1000, nanoseconds: 0 }) },
    __mocks: { mockSet, mockGet, mockDoc, mockCollection },
  }
})

jest.mock('@functions/lib/gtfs-utils', () => ({
  fetchText: jest.fn(),
  headRequest: jest.fn(),
}))

import {
  hasCtaFeedChanged,
  hasMetraFeedChanged,
  hasPaceFeedChanged,
  updateCtaMeta,
  updateMetraMeta,
  updatePaceMeta,
} from '@functions/lib/change-detection'
import { fetchText, headRequest } from '@functions/lib/gtfs-utils'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('firebase-admin/firestore')
const { mockSet, mockGet, mockDoc, mockCollection } = __mocks

const mockFetchText = fetchText as jest.Mock
const mockHeadRequest = headRequest as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('hasCtaFeedChanged', () => {
  it('returns changed=true when no previous record exists', async () => {
    mockGet.mockResolvedValue({ data: () => undefined })
    mockHeadRequest.mockResolvedValue({
      'last-modified': 'Tue, 24 Mar 2026 19:44:07 GMT',
      etag: '"abc123"',
    })

    const result = await hasCtaFeedChanged()

    expect(result.changed).toBe(true)
    expect(result.lastModified).toBe('Tue, 24 Mar 2026 19:44:07 GMT')
    expect(result.etag).toBe('"abc123"')
  })

  it('returns changed=false when headers match stored values', async () => {
    mockGet.mockResolvedValue({
      data: () => ({
        lastModified: 'Tue, 24 Mar 2026 19:44:07 GMT',
        etag: '"abc123"',
      }),
    })
    mockHeadRequest.mockResolvedValue({
      'last-modified': 'Tue, 24 Mar 2026 19:44:07 GMT',
      etag: '"abc123"',
    })

    const result = await hasCtaFeedChanged()

    expect(result.changed).toBe(false)
  })

  it('returns changed=true when Last-Modified differs', async () => {
    mockGet.mockResolvedValue({
      data: () => ({
        lastModified: 'Mon, 23 Mar 2026 10:00:00 GMT',
        etag: '"abc123"',
      }),
    })
    mockHeadRequest.mockResolvedValue({
      'last-modified': 'Tue, 24 Mar 2026 19:44:07 GMT',
      etag: '"abc123"',
    })

    const result = await hasCtaFeedChanged()

    expect(result.changed).toBe(true)
  })
})

describe('hasMetraFeedChanged', () => {
  it('returns changed=true when no previous record exists', async () => {
    mockGet.mockResolvedValue({ data: () => undefined })
    mockFetchText.mockResolvedValue('03/06/26 02:20:03 AM America/Chicago')

    const result = await hasMetraFeedChanged()

    expect(result.changed).toBe(true)
    expect(result.publishedTimestamp).toBe('03/06/26 02:20:03 AM America/Chicago')
  })

  it('returns changed=false when timestamp matches', async () => {
    mockGet.mockResolvedValue({
      data: () => ({
        publishedTimestamp: '03/06/26 02:20:03 AM America/Chicago',
      }),
    })
    mockFetchText.mockResolvedValue('03/06/26 02:20:03 AM America/Chicago')

    const result = await hasMetraFeedChanged()

    expect(result.changed).toBe(false)
  })

  it('returns changed=true when timestamp differs', async () => {
    mockGet.mockResolvedValue({
      data: () => ({
        publishedTimestamp: '03/01/26 02:20:03 AM America/Chicago',
      }),
    })
    mockFetchText.mockResolvedValue('03/06/26 02:20:03 AM America/Chicago')

    const result = await hasMetraFeedChanged()

    expect(result.changed).toBe(true)
  })
})

describe('updateCtaMeta', () => {
  it('writes CTA metadata to Firestore', async () => {
    await updateCtaMeta('Tue, 24 Mar 2026 19:44:07 GMT', '"abc123"')

    expect(mockCollection).toHaveBeenCalledWith('gtfs-meta')
    expect(mockDoc).toHaveBeenCalledWith('cta')
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        lastModified: 'Tue, 24 Mar 2026 19:44:07 GMT',
        etag: '"abc123"',
      }),
      { merge: true },
    )
  })
})

describe('updateMetraMeta', () => {
  it('writes Metra metadata to Firestore', async () => {
    await updateMetraMeta('03/06/26 02:20:03 AM America/Chicago')

    expect(mockCollection).toHaveBeenCalledWith('gtfs-meta')
    expect(mockDoc).toHaveBeenCalledWith('metra')
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedTimestamp: '03/06/26 02:20:03 AM America/Chicago',
      }),
      { merge: true },
    )
  })
})

describe('hasPaceFeedChanged', () => {
  it('reports changed when no prior meta exists', async () => {
    mockHeadRequest.mockResolvedValue({
      'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
      etag: 'abc',
    })
    mockGet.mockResolvedValue({ data: () => undefined })

    const result = await hasPaceFeedChanged()

    expect(result.changed).toBe(true)
    expect(result.lastModified).toBe('Mon, 01 Jan 2024 00:00:00 GMT')
    expect(result.etag).toBe('abc')
  })

  it('reports unchanged when headers match stored meta', async () => {
    mockHeadRequest.mockResolvedValue({
      'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
      etag: 'abc',
    })
    mockGet.mockResolvedValue({
      data: () => ({ lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT', etag: 'abc' }),
    })

    const result = await hasPaceFeedChanged()

    expect(result.changed).toBe(false)
  })
})

describe('updatePaceMeta', () => {
  it('writes Pace metadata to Firestore', async () => {
    await updatePaceMeta('Mon, 01 Jan 2024 00:00:00 GMT', 'abc')

    expect(mockCollection).toHaveBeenCalledWith('gtfs-meta')
    expect(mockDoc).toHaveBeenCalledWith('pace')
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
        etag: 'abc',
      }),
      { merge: true },
    )
  })
})
