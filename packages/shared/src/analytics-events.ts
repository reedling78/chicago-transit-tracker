export type AnalyticsAuthMethod = 'apple' | 'google' | 'password'
export type AnalyticsTransitService = 'cta' | 'metra'
export type AnalyticsDashboardItemType = 'line' | 'station' | 'train'

export type AnalyticsEventMap = {
  sign_up: { method: AnalyticsAuthMethod }
  login: { method: AnalyticsAuthMethod }
  logout: Record<string, never>
  dashboard_item_added: { item_type: AnalyticsDashboardItemType; item_id: string }
  dashboard_item_removed: { item_type: AnalyticsDashboardItemType; item_id: string }
  dashboard_items_cleared: { count: number }
  dashboard_items_reordered: { count: number }
  line_opened: { service: AnalyticsTransitService; line_id: string }
  station_opened: { service: AnalyticsTransitService; station_id: string }
  train_opened: { line_id: string; train_number: string }
  alerts_opened: { service: AnalyticsTransitService }
  alert_link_clicked: { service: AnalyticsTransitService; alert_id: string }
}

export type AnalyticsEventName = keyof AnalyticsEventMap

export type AnalyticsEventParams<E extends AnalyticsEventName> = AnalyticsEventMap[E]

export type AnalyticsUserProperty = 'auth_provider'

export type AnalyticsUserPropertyValueMap = {
  auth_provider: AnalyticsAuthMethod | 'unknown'
}
