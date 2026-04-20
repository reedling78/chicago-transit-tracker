/**
 * Tests for the Cloud Functions entry point (functions/src/index.ts).
 *
 * Since firebase-functions is only installed in functions/node_modules,
 * we need to create manual mocks before importing the module.
 */

// Create virtual mocks for modules not installed in root
beforeAll(() => {
  jest.doMock(
    'firebase-functions/v2/scheduler',
    () => ({
      onSchedule: jest.fn((_opts: unknown, handler: () => Promise<void>) => handler),
    }),
    { virtual: true },
  )

  jest.doMock(
    'firebase-functions/v2/https',
    () => ({
      onRequest: jest.fn((_opts: unknown, handler: unknown) => handler),
    }),
    { virtual: true },
  )

  jest.doMock(
    'firebase-functions/params',
    () => ({
      defineSecret: jest.fn(() => ({ value: () => 'test-token' })),
    }),
    { virtual: true },
  )

  jest.doMock(
    'firebase-functions/v2',
    () => ({
      logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
    }),
    { virtual: true },
  )
})

const mockWhere = jest.fn().mockReturnValue({
  get: jest.fn().mockResolvedValue({ docs: [] }),
})
const mockCollection = jest.fn().mockReturnValue({ where: mockWhere })

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn().mockReturnValue({ collection: mockCollection }),
  Timestamp: { now: jest.fn().mockReturnValue({ seconds: 0 }) },
}))

jest.mock('@functions/lib/change-detection', () => ({
  hasCtaFeedChanged: jest.fn(),
  hasMetraFeedChanged: jest.fn(),
  hasPaceFeedChanged: jest.fn(),
  updateCtaMeta: jest.fn().mockResolvedValue(undefined),
  updateMetraMeta: jest.fn().mockResolvedValue(undefined),
  updatePaceMeta: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@functions/lib/gtfs-utils', () => ({
  downloadBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-zip')),
}))

jest.mock('@functions/lib/firestore-writer', () => ({
  batchWrite: jest.fn().mockResolvedValue(0),
}))

jest.mock('@functions/lib/parsers/cta-schedules', () => ({
  parseCtaSchedules: jest.fn().mockReturnValue(new Map()),
}))

jest.mock('@functions/lib/parsers/metra-schedules', () => ({
  parseMetraSchedules: jest.fn().mockReturnValue(new Map()),
}))

jest.mock('@functions/lib/parsers/metra-trips', () => ({
  parseMetraTrips: jest.fn().mockReturnValue({
    tripDetails: new Map(),
    tripIndexes: new Map(),
    stationTrips: new Map(),
  }),
}))

jest.mock('@functions/lib/parsers/pace-schedules', () => ({
  parsePaceGtfs: jest.fn().mockReturnValue({
    routes: new Map(),
    stops: new Map(),
    routeStops: new Map(),
    schedules: new Map(),
  }),
}))

jest.mock('@functions/lib/parsers/cta-alerts', () => ({
  normalizeCtaAlerts: jest.fn().mockReturnValue([]),
}))

jest.mock('@functions/lib/parsers/metra-alerts', () => ({
  normalizeMetraAlerts: jest.fn().mockReturnValue([]),
}))

jest.mock('adm-zip', () => jest.fn().mockImplementation(() => ({})))

// Dynamic imports after mocks are registered
let syncCtaGtfs: () => Promise<void>
let syncMetraGtfs: () => Promise<void>
let syncPaceGtfs: () => Promise<void>
let mockHasCtaChanged: jest.Mock
let mockHasMetraChanged: jest.Mock
let mockHasPaceChanged: jest.Mock
let mockDownload: jest.Mock
let mockBatchWrite: jest.Mock
let mockUpdateCtaMeta: jest.Mock
let mockUpdateMetraMeta: jest.Mock
let mockUpdatePaceMeta: jest.Mock
let mockParseCtaSchedules: jest.Mock

beforeAll(async () => {
  const indexMod = await import('@functions/index')
  // onSchedule mock returns the handler directly
  syncCtaGtfs = indexMod.syncCtaGtfs as unknown as () => Promise<void>
  syncMetraGtfs = indexMod.syncMetraGtfs as unknown as () => Promise<void>
  syncPaceGtfs = indexMod.syncPaceGtfs as unknown as () => Promise<void>

  const changeDet = await import('@functions/lib/change-detection')
  mockHasCtaChanged = changeDet.hasCtaFeedChanged as jest.Mock
  mockHasMetraChanged = changeDet.hasMetraFeedChanged as jest.Mock
  mockHasPaceChanged = changeDet.hasPaceFeedChanged as jest.Mock
  mockUpdateCtaMeta = changeDet.updateCtaMeta as jest.Mock
  mockUpdateMetraMeta = changeDet.updateMetraMeta as jest.Mock
  mockUpdatePaceMeta = changeDet.updatePaceMeta as jest.Mock

  const utils = await import('@functions/lib/gtfs-utils')
  mockDownload = utils.downloadBuffer as jest.Mock

  const writer = await import('@functions/lib/firestore-writer')
  mockBatchWrite = writer.batchWrite as jest.Mock

  const ctaParser = await import('@functions/lib/parsers/cta-schedules')
  mockParseCtaSchedules = ctaParser.parseCtaSchedules as jest.Mock
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('syncCtaGtfs', () => {
  it('skips sync when feed is unchanged', async () => {
    mockHasCtaChanged.mockResolvedValue({ changed: false })

    await syncCtaGtfs()

    expect(mockDownload).not.toHaveBeenCalled()
    expect(mockBatchWrite).not.toHaveBeenCalled()
    expect(mockUpdateCtaMeta).not.toHaveBeenCalled()
  })

  it('downloads, parses, and writes when feed has changed', async () => {
    mockHasCtaChanged.mockResolvedValue({
      changed: true,
      lastModified: 'Tue, 24 Mar 2026',
      etag: '"abc"',
    })
    mockParseCtaSchedules.mockReturnValue(
      new Map([['clark-lake', { service: 'cta', directions: [] }]]),
    )
    mockBatchWrite.mockResolvedValue(1)

    await syncCtaGtfs()

    expect(mockDownload).toHaveBeenCalled()
    expect(mockBatchWrite).toHaveBeenCalledWith('schedules', expect.any(Map))
    expect(mockUpdateCtaMeta).toHaveBeenCalledWith('Tue, 24 Mar 2026', '"abc"')
  })
})

describe('syncMetraGtfs', () => {
  it('skips sync when feed is unchanged', async () => {
    mockHasMetraChanged.mockResolvedValue({ changed: false })

    await syncMetraGtfs()

    expect(mockDownload).not.toHaveBeenCalled()
    expect(mockBatchWrite).not.toHaveBeenCalled()
    expect(mockUpdateMetraMeta).not.toHaveBeenCalled()
  })

  it('downloads, parses, and writes all collections when feed has changed', async () => {
    mockHasMetraChanged.mockResolvedValue({
      changed: true,
      publishedTimestamp: '03/06/26 02:20:03 AM',
    })
    mockBatchWrite.mockResolvedValue(1)

    await syncMetraGtfs()

    expect(mockDownload).toHaveBeenCalled()
    // Should write to 4 collections
    expect(mockBatchWrite).toHaveBeenCalledTimes(4)
    expect(mockBatchWrite).toHaveBeenCalledWith('schedules', expect.any(Map))
    expect(mockBatchWrite).toHaveBeenCalledWith('metra-trips', expect.any(Map))
    expect(mockBatchWrite).toHaveBeenCalledWith('metra-trip-indexes', expect.any(Map))
    expect(mockBatchWrite).toHaveBeenCalledWith('metra-station-trips', expect.any(Map))
    expect(mockUpdateMetraMeta).toHaveBeenCalledWith('03/06/26 02:20:03 AM')
  })
})

describe('syncPaceGtfs', () => {
  it('skips sync when feed is unchanged', async () => {
    mockHasPaceChanged.mockResolvedValue({ changed: false })

    await syncPaceGtfs()

    expect(mockDownload).not.toHaveBeenCalled()
    expect(mockBatchWrite).not.toHaveBeenCalled()
    expect(mockUpdatePaceMeta).not.toHaveBeenCalled()
  })

  it('downloads, parses, and writes all four pace collections when feed has changed', async () => {
    mockHasPaceChanged.mockResolvedValue({
      changed: true,
      lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
      etag: 'abc',
    })
    mockBatchWrite.mockResolvedValue(0)

    await syncPaceGtfs()

    expect(mockDownload).toHaveBeenCalled()
    expect(mockBatchWrite).toHaveBeenCalledTimes(4)
    expect(mockBatchWrite).toHaveBeenCalledWith('pace-routes', expect.any(Map))
    expect(mockBatchWrite).toHaveBeenCalledWith('pace-stops', expect.any(Map))
    expect(mockBatchWrite).toHaveBeenCalledWith('pace-route-stops', expect.any(Map))
    expect(mockBatchWrite).toHaveBeenCalledWith('pace-schedules', expect.any(Map))
    expect(mockUpdatePaceMeta).toHaveBeenCalledWith('Mon, 01 Jan 2024 00:00:00 GMT', 'abc')
  })
})
