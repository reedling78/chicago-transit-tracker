import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import type { Favorite, Line } from '@ctt/shared'
import CardMenuButton from './CardMenuButton'
import { cardStyles } from './cardStyles'

interface LineCardProps {
  favorite: Favorite
  line: Line | undefined
  onLongPress: () => void
  onMenuPress: () => void
  isActive?: boolean
}

export default function LineCard({
  favorite,
  line,
  onLongPress,
  onMenuPress,
  isActive,
}: LineCardProps) {
  const router = useRouter()
  const target = line ? `/${line.service}/${line.slug}` : null
  const title = line?.name ?? favorite.id

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
        {line?.termini?.length ? (
          <Text style={cardStyles.subtitle} numberOfLines={1}>
            {line.termini.join(' — ')}
          </Text>
        ) : null}
      </View>
      {line ? (
        <View style={[cardStyles.chip, { backgroundColor: line.color }]}>
          <Text style={[cardStyles.chipText, { color: line.textColor }]} numberOfLines={1}>
            {line.shortName}
          </Text>
        </View>
      ) : null}
      <CardMenuButton onPress={onMenuPress} accessibilityLabel={`Open menu for ${title}`} />
    </Pressable>
  )
}
