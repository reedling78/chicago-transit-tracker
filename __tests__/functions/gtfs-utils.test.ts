import {
  timeToMinutes,
  formatGTFSTime,
  safeTripId,
  parseGTFS,
  buildServiceTypeMap,
  readZipFile,
} from '@functions/lib/gtfs-utils'
import AdmZip from 'adm-zip'

describe('timeToMinutes', () => {
  it('converts standard morning time', () => {
    expect(timeToMinutes('08:30:00')).toBe(510)
  })

  it('converts midnight', () => {
    expect(timeToMinutes('00:00:00')).toBe(0)
  })

  it('converts noon', () => {
    expect(timeToMinutes('12:00:00')).toBe(720)
  })

  it('handles GTFS times exceeding 24h (next-day service)', () => {
    expect(timeToMinutes('25:15:00')).toBe(1515)
  })
})

describe('formatGTFSTime', () => {
  it('formats morning time', () => {
    expect(formatGTFSTime('08:30:00')).toBe('8:30 AM')
  })

  it('formats afternoon time', () => {
    expect(formatGTFSTime('14:05:00')).toBe('2:05 PM')
  })

  it('formats midnight as 12:00 AM', () => {
    expect(formatGTFSTime('00:00:00')).toBe('12:00 AM')
  })

  it('formats noon as 12:00 PM', () => {
    expect(formatGTFSTime('12:00:00')).toBe('12:00 PM')
  })

  it('handles GTFS times exceeding 24h (wraps around)', () => {
    expect(formatGTFSTime('25:15:00')).toBe('1:15 AM')
  })
})

describe('safeTripId', () => {
  it('lowercases the trip ID', () => {
    expect(safeTripId('BNSF_BN1234')).toBe('bnsf_bn1234')
  })

  it('replaces special characters with underscores', () => {
    expect(safeTripId('trip.123/abc')).toBe('trip_123_abc')
  })

  it('preserves hyphens and underscores', () => {
    expect(safeTripId('up-n_1234')).toBe('up-n_1234')
  })
})

describe('parseGTFS', () => {
  it('parses CSV with headers', () => {
    const csv = 'stop_id,stop_name\n40380,Clark/Lake\n40530,Washington'
    const rows = parseGTFS(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].stop_id).toBe('40380')
    expect(rows[0].stop_name).toBe('Clark/Lake')
  })

  it('trims whitespace', () => {
    const csv = 'id, name \n 1 , hello '
    const rows = parseGTFS(csv)
    expect(rows[0].name).toBe('hello')
  })

  it('skips empty lines', () => {
    const csv = 'id,name\n1,a\n\n2,b\n'
    const rows = parseGTFS(csv)
    expect(rows).toHaveLength(2)
  })
})

describe('buildServiceTypeMap', () => {
  it('maps weekday services', () => {
    const rows = [
      {
        service_id: 'WK',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0',
      },
    ]
    const map = buildServiceTypeMap(rows)
    expect(map.get('WK')).toBe('weekday')
  })

  it('maps saturday services', () => {
    const rows = [
      {
        service_id: 'SAT',
        monday: '0',
        tuesday: '0',
        wednesday: '0',
        thursday: '0',
        friday: '0',
        saturday: '1',
        sunday: '0',
      },
    ]
    const map = buildServiceTypeMap(rows)
    expect(map.get('SAT')).toBe('saturday')
  })

  it('maps sunday services', () => {
    const rows = [
      {
        service_id: 'SUN',
        monday: '0',
        tuesday: '0',
        wednesday: '0',
        thursday: '0',
        friday: '0',
        saturday: '0',
        sunday: '1',
      },
    ]
    const map = buildServiceTypeMap(rows)
    expect(map.get('SUN')).toBe('sunday')
  })
})

describe('readZipFile', () => {
  it('reads a file from a zip', () => {
    const zip = new AdmZip()
    zip.addFile('test.txt', Buffer.from('hello world'))
    expect(readZipFile(zip, 'test.txt')).toBe('hello world')
  })

  it('throws if file is missing', () => {
    const zip = new AdmZip()
    expect(() => readZipFile(zip, 'missing.txt')).toThrow('GTFS zip missing file: missing.txt')
  })
})
