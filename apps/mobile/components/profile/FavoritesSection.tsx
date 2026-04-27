import { StyleSheet, Text, View } from 'react-native'
import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteKey } from '@ctt/shared'
import FavoriteRow from './FavoriteRow'

interface FavoritesSectionProps {
  title: string
  favorites: Favorite[]
  lines: Line[] | undefined
  stations: Station[] | undefined
}

export default function FavoritesSection({
  title,
  favorites,
  lines,
  stations,
}: FavoritesSectionProps) {
  if (favorites.length === 0) return null
  return (
    <View>
      <Text style={styles.heading}>{title.toUpperCase()}</Text>
      <View style={styles.list}>
        {favorites.map((fav, index) => (
          <FavoriteRow
            key={favoriteKey(fav.type, fav.id)}
            favorite={fav}
            lines={lines}
            stations={stations}
            isLast={index === favorites.length - 1}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  heading: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  list: {
    backgroundColor: '#111827',
    borderRadius: 10,
    overflow: 'hidden',
  },
})
