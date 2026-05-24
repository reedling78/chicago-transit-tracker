import type {
  AnalyticsEventMap,
  AnalyticsEventName,
  AnalyticsEventParams,
  AnalyticsUserPropertyValueMap,
} from '@ctt/shared'

describe('shared analytics-events contract', () => {
  it('exposes every documented event name', () => {
    const sample: Record<AnalyticsEventName, true> = {
      sign_up: true,
      login: true,
      logout: true,
      dashboard_item_added: true,
      dashboard_item_removed: true,
      dashboard_items_cleared: true,
      dashboard_items_reordered: true,
      line_opened: true,
      station_opened: true,
      train_opened: true,
      alerts_opened: true,
      alert_link_clicked: true,
    }
    expect(Object.keys(sample).sort()).toEqual(
      [
        'alert_link_clicked',
        'alerts_opened',
        'dashboard_item_added',
        'dashboard_item_removed',
        'dashboard_items_cleared',
        'dashboard_items_reordered',
        'line_opened',
        'login',
        'sign_up',
        'station_opened',
        'train_opened',
        'logout',
      ].sort(),
    )
  })

  it('enforces event name length under the GA4 40-char cap', () => {
    const names: AnalyticsEventName[] = [
      'sign_up',
      'login',
      'logout',
      'dashboard_item_added',
      'dashboard_item_removed',
      'dashboard_items_cleared',
      'dashboard_items_reordered',
      'line_opened',
      'station_opened',
      'train_opened',
      'alerts_opened',
      'alert_link_clicked',
    ]
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(40)
    }
  })

  it('lets a typed payload satisfy its event contract', () => {
    const signUp: AnalyticsEventParams<'sign_up'> = { method: 'apple' }
    const dashAdd: AnalyticsEventParams<'dashboard_item_added'> = {
      item_type: 'station',
      item_id: 'union-station-metra',
    }
    const cleared: AnalyticsEventParams<'dashboard_items_cleared'> = { count: 3 }

    expect(signUp.method).toBe('apple')
    expect(dashAdd.item_type).toBe('station')
    expect(cleared.count).toBe(3)
  })

  it('exposes the auth_provider user property values', () => {
    const v: AnalyticsUserPropertyValueMap['auth_provider'] = 'google'
    expect(v).toBe('google')
  })

  it('keeps the event map and event-name types in lock-step', () => {
    const map: Pick<AnalyticsEventMap, 'sign_up'> = { sign_up: { method: 'password' } }
    expect(map.sign_up.method).toBe('password')
  })
})
