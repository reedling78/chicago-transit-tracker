import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteRoute } from '../../../lib/favoriteRoute'
import CardMenuButton from './CardMenuButton'
import { cardStyles } from './cardStyles'

interface StationCardProps {
  favorite: Favorite
  station: Station | undefined
  lines: Line[] | undefined
  onLongPress: () => void
  onMenuPress: () => void
  isActive?: boolean
}

export default function StationCard({
  favorite,
  station,
  lines,
  onLongPress,
  onMenuPress,
  isActive,
}: StationCardProps) {
  const router = useRouter()
  const target = station ? favoriteRoute(favorite, lines, [station]) : null
  const title = station?.name ?? favorite.id
  const subtitle = station?.lines?.join(' • ') ?? ''
  const meta = station?.service === 'metra' ? 'Metra' : 'CTA'

  return (
    <Pressable
      onPress={() => target && router.push(target as never)}
      onLongPress={onLongPress}
      delayLongPress={250}
      disabled={!target}
      accessibilityRole="link"
      accessibilityLabel={title}
      style={[cardStyles.row, isActive && cardStyles.rowDragging]}
    >
      <View style={cardStyles.content}>
        <Text style={cardStyles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={cardStyles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {station ? <Text style={cardStyles.meta}>{meta}</Text> : null}
      <CardMenuButton onPress={onMenuPress} accessibilityLabel={`Open menu for ${title}`} />
    </Pressable>
  )
}
