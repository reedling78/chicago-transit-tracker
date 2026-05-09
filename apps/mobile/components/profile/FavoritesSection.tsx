import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteKey } from '@ctt/shared'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'
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
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    heading: {
      color: theme.colors.text.secondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: theme.space[2],
    },
    list: {
      backgroundColor: theme.colors.bg.elevated,
      borderRadius: theme.radius.md - 2,
      overflow: 'hidden',
    },
  })
}
