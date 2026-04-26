import { useEffect, useRef } from 'react'
import { Pressable, View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { useToggleFavorite } from '../lib/useToggleFavorite'
import { useAuth } from '../lib/AuthContext'
import { useFavoritesStore } from '../lib/store/favorites'
import type { FavoriteType } from '@ctt/shared'

interface Props {
  type: FavoriteType
  id: string
  color?: string
  fillColor?: string
}

const HEART_PATH =
  'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'

export default function FavoriteButton({ type, id, color = '#fff', fillColor = '#ef4444' }: Props) {
  const { user } = useAuth()
  const { isFavorited, toggle, isToggling, needsAuth } = useToggleFavorite(type, id)
  const router = useRouter()
  const pendingAddRef = useRef(false)

  useEffect(() => {
    if (user && pendingAddRef.current) {
      pendingAddRef.current = false
      if (!useFavoritesStore.getState().has(type, id)) {
        toggle()
      }
    }
  }, [user, type, id, toggle])

  const handlePress = () => {
    if (needsAuth) {
      pendingAddRef.current = true
      router.push('/auth')
      return
    }
    toggle()
  }

  const label = isFavorited ? 'Remove from favorites' : 'Add to favorites'

  return (
    <Pressable
      onPress={handlePress}
      disabled={isToggling}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFavorited, disabled: isToggling }}
      style={({ pressed }) => [
        styles.touchable,
        { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <View style={styles.circle}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path
            d={HEART_PATH}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isFavorited ? fillColor : 'none'}
          />
        </Svg>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  touchable: {
    width: 48,
    height: 48,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
