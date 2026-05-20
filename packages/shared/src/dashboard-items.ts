import type { DashboardItem, DashboardItemType } from './types'

export function dashboardItemKey(type: DashboardItemType, id: string): string {
  return `${type}:${id}`
}

export function arrayToMap(items: DashboardItem[]): Record<string, DashboardItem> {
  const map: Record<string, DashboardItem> = {}
  for (const item of items) {
    map[dashboardItemKey(item.type, item.id)] = item
  }
  return map
}

export function mapToArray(
  map: Record<string, DashboardItem> | null | undefined,
): DashboardItem[] {
  if (!map) return []
  return Object.values(map).sort((a, b) => {
    const aPos = typeof a.position === 'number' ? a.position : Number.POSITIVE_INFINITY
    const bPos = typeof b.position === 'number' ? b.position : Number.POSITIVE_INFINITY
    if (aPos !== bPos) return aPos - bPos
    if (a.addedAt === b.addedAt) return 0
    return a.addedAt < b.addedAt ? 1 : -1
  })
}
