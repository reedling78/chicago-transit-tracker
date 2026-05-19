import { useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { useToggleFavorite } from '../lib/useToggleFavorite'
import { useAuth } from '../lib/AuthContext'
import { useFavoritesStore } from '../lib/store/favorites'
import { useTheme } from '../lib/theme'
import type { FavoriteType } from '@ctt/shared'
import PressableButton from './PressableButton'

interface Props {
  type: FavoriteType
  id: string
  color?: string
  fillColor?: string
}

const HEART_PATH =
  'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'

export default function FavoriteButton({ type, id, color, fillColor = '#ef4444' }: Props) {
  const { user } = useAuth()
  const { isFavorited, toggle, isToggling, needsAuth } = useToggleFavorite(type, id)
  const router = useRouter()
  const { theme } = useTheme()
  const pendingAddRef = useRef(false)
  const strokeColor = color ?? theme.colors.text.primary

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
    <PressableButton
      onPress={handlePress}
      disabled={isToggling}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFavorited, disabled: isToggling }}
      feedback="default"
      haptic="light"
      style={styles.touchable}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path
          d={HEART_PATH}
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={isFavorited ? fillColor : 'none'}
        />
      </Svg>
    </PressableButton>
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
})
