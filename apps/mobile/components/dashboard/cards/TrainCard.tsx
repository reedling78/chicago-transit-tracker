import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import type { Favorite } from '@ctt/shared'
import { useFavoriteTripQuery } from '../../../lib/useDashboardQueries'
import CardMenuButton from './CardMenuButton'
import { cardStyles } from './cardStyles'

interface TrainCardProps {
  favorite: Favorite
  onLongPress: () => void
  onMenuPress: () => void
  isActive?: boolean
}

export default function TrainCard({
  favorite,
  onLongPress,
  onMenuPress,
  isActive,
}: TrainCardProps) {
  const router = useRouter()
  const { data: trip } = useFavoriteTripQuery(favorite.id)
  const [lineSlug, trainNumberFromId] = favorite.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? favorite.id
  const title = `Train ${trainNumber}`
  const subtitle = trip
    ? trip.headsign
      ? `To ${trip.headsign}`
      : (trip.lineName ?? lineSlug)
    : 'Trip not currently scheduled'

  return (
    <Pressable
      onPress={() => router.push(`/metra/${lineSlug}/train/${trainNumber}` as never)}
      onLongPress={onLongPress}
      delayLongPress={250}
      accessibilityRole="link"
      accessibilityLabel={title}
      style={[cardStyles.row, isActive && cardStyles.rowDragging]}
    >
      <View style={cardStyles.content}>
        <Text style={cardStyles.title}>{title}</Text>
        <Text style={cardStyles.subtitle}>{subtitle}</Text>
      </View>
      {trip?.serviceType ? <Text style={cardStyles.meta}>{trip.serviceType}</Text> : null}
      <CardMenuButton onPress={onMenuPress} accessibilityLabel={`Open menu for ${title}`} />
    </Pressable>
  )
}
