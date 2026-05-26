/**
 * Locks in that every mobile detail / alerts screen wires the analytics
 * call sites. The hook behavior itself is covered in
 * lib/useAnalyticsScreenTracking.test.tsx and lib/analytics.test.ts —
 * this file just guards the screen wiring so a regression on any one
 * screen trips the suite.
 */
import * as fs from 'fs'
import * as path from 'path'

const repo = path.resolve(__dirname, '..', '..')

function read(relPath: string): string {
  return fs.readFileSync(path.join(repo, relPath), 'utf-8')
}

describe('mobile analytics screen wiring', () => {
  it.each([
    ['app/(app)/cta/[line].tsx', 'line_opened', /service: 'cta'/],
    ['app/(app)/metra/[line]/index.tsx', 'line_opened', /service: 'metra'/],
    ['app/(app)/cta/station/[station].tsx', 'station_opened', /service: 'cta'/],
    ['app/(app)/metra/station/[station].tsx', 'station_opened', /service: 'metra'/],
    ['app/(app)/metra/[line]/train/[trainNumber].tsx', 'train_opened', /line_id|train_number/],
    ['app/(app)/cta/alerts.tsx', 'alerts_opened', /service: 'cta'/],
    ['app/(app)/metra/alerts.tsx', 'alerts_opened', /service: 'metra'/],
  ])('%s emits %s', (file, event, paramsPattern) => {
    const src = read(file)
    expect(src).toMatch(new RegExp(event))
    expect(src).toMatch(paramsPattern)
  })

  it('root Stack layout calls useAnalyticsScreenTracking', () => {
    const src = read('app/(app)/_layout.tsx')
    expect(src).toMatch(/useAnalyticsScreenTracking\(\)/)
  })

  it('AlertCard accepts a service prop and emits alert_link_clicked', () => {
    const src = read('components/AlertCard.tsx')
    expect(src).toMatch(/service\?: AnalyticsTransitService/)
    expect(src).toMatch(/alert_link_clicked/)
  })

  it('CTAAlerts passes service="cta" to AlertCard', () => {
    const src = read('components/CTAAlerts.tsx')
    expect(src).toMatch(/service="cta"/)
  })

  it('MetraAlerts passes service="metra" to AlertCard', () => {
    const src = read('components/MetraAlerts.tsx')
    expect(src).toMatch(/service="metra"/)
  })
})

describe('mobile Firebase native config files', () => {
  it('GoogleService-Info.plist is committed with the canonical bundle id', () => {
    const src = read('GoogleService-Info.plist')
    expect(src).toContain('com.chicagotransittracker.app')
    expect(src).toContain('chicago-transit-tracker')
  })

  it('google-services.json is committed with the canonical package name', () => {
    const src = read('google-services.json')
    expect(src).toContain('com.chicagotransittracker.app')
    expect(src).toContain('chicago-transit-tracker')
  })

  it('app.json wires the Firebase config plugin + googleServicesFile paths', () => {
    const src = read('app.json')
    expect(src).toContain('@react-native-firebase/app')
    expect(src).toContain('./GoogleService-Info.plist')
    expect(src).toContain('./google-services.json')
  })
})
