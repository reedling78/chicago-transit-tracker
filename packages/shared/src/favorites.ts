import type { Favorite, FavoriteType } from './types'

export function favoriteKey(type: FavoriteType, id: string): string {
  return `${type}:${id}`
}

export function arrayToMap(favorites: Favorite[]): Record<string, Favorite> {
  const map: Record<string, Favorite> = {}
  for (const fav of favorites) {
    map[favoriteKey(fav.type, fav.id)] = fav
  }
  return map
}

export function mapToArray(map: Record<string, Favorite> | null | undefined): Favorite[] {
  if (!map) return []
  return Object.values(map).sort((a, b) => {
    if (a.addedAt === b.addedAt) return 0
    return a.addedAt < b.addedAt ? 1 : -1
  })
}
