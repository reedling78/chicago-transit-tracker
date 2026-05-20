import type { DashboardItem } from '@ctt/shared'
import { dashboardItemRoute } from '../../lib/dashboardItemRoute'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../fixtures'

describe('dashboardItemRoute', () => {
  describe('line', () => {
    it('routes a CTA line to /cta/{slug}', () => {
      const fav: DashboardItem = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }
      expect(dashboardItemRoute(fav, [mockLine, mockMetraLine], [])).toBe('/cta/red')
    })

    it('routes a Metra line to /metra/{slug}', () => {
      const fav: DashboardItem = { type: 'line', id: 'bnsf', addedAt: '2026-04-25T10:00:00Z' }
      expect(dashboardItemRoute(fav, [mockLine, mockMetraLine], [])).toBe('/metra/bnsf')
    })

    it('returns null when the line is unknown', () => {
      const fav: DashboardItem = { type: 'line', id: 'ghost', addedAt: '2026-04-25T10:00:00Z' }
      expect(dashboardItemRoute(fav, [mockLine], [])).toBeNull()
    })

    it('returns null when lines is undefined (still loading)', () => {
      const fav: DashboardItem = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }
      expect(dashboardItemRoute(fav, undefined, [])).toBeNull()
    })
  })

  describe('station', () => {
    it('routes a CTA station via its first line', () => {
      const fav: DashboardItem = {
        type: 'station',
        id: 'clark-lake',
        addedAt: '2026-04-25T10:00:00Z',
      }
      expect(dashboardItemRoute(fav, [mockLine, mockMetraLine], [mockStation])).toBe(
        '/cta/station/clark-lake',
      )
    })

    it('routes a Metra station via its first line', () => {
      const fav: DashboardItem = { type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }
      expect(dashboardItemRoute(fav, [mockLine, mockMetraLine], [mockMetraStation])).toBe(
        '/metra/station/aurora',
      )
    })

    it('falls back to the service index when the line is unknown', () => {
      const fav: DashboardItem = { type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }
      expect(dashboardItemRoute(fav, [], [mockMetraStation])).toBe('/metra')
    })

    it('returns null when the station is unknown', () => {
      const fav: DashboardItem = { type: 'station', id: 'ghost', addedAt: '2026-04-25T10:00:00Z' }
      expect(dashboardItemRoute(fav, [mockLine], [mockStation])).toBeNull()
    })
  })

  describe('train', () => {
    it('routes via /metra/{lineSlug}/train/{trainNumber}', () => {
      const fav: DashboardItem = {
        type: 'train',
        id: 'bnsf_1234',
        addedAt: '2026-04-25T10:00:00Z',
      }
      expect(dashboardItemRoute(fav, [], [])).toBe('/metra/bnsf/train/1234')
    })

    it('returns null when the train id is malformed', () => {
      const fav: DashboardItem = {
        type: 'train',
        id: 'not-a-train-id',
        addedAt: '2026-04-25T10:00:00Z',
      }
      expect(dashboardItemRoute(fav, [], [])).toBeNull()
    })
  })
})
