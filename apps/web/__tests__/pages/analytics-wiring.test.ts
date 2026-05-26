/**
 * Locks in that every detail / alerts page mounts AnalyticsMount with the
 * expected event. The behavior of AnalyticsMount itself is covered separately
 * in components/AnalyticsMount.test.tsx — this file just guards the wiring
 * so a regression on any one page is caught loudly.
 */
import * as fs from 'fs'
import * as path from 'path'

const repo = path.resolve(__dirname, '..', '..')

function read(relPath: string): string {
  return fs.readFileSync(path.join(repo, relPath), 'utf-8')
}

describe('AnalyticsMount wiring on web pages', () => {
  it.each([
    ['app/cta/[line]/page.tsx', /event="line_opened".*service: 'cta'/s],
    ['app/metra/[line]/page.tsx', /event="line_opened".*service: 'metra'/s],
    ['app/cta/[line]/[station]/page.tsx', /event="station_opened".*service: 'cta'/s],
    ['app/metra/[line]/[station]/page.tsx', /event="station_opened".*service: 'metra'/s],
    ['app/metra/[line]/train/[trainNumber]/page.tsx', /event="train_opened"/],
    ['app/cta/alerts/page.tsx', /event="alerts_opened".*service: 'cta'/s],
    ['app/metra/alerts/page.tsx', /event="alerts_opened".*service: 'metra'/s],
  ])('%s wires AnalyticsMount with the expected event', (file, eventPattern) => {
    const src = read(file)
    expect(src).toMatch(/from '@components\/AnalyticsMount'/)
    expect(src).toMatch(/<AnalyticsMount/)
    expect(src).toMatch(eventPattern)
  })
})
