import { StyleSheet } from 'react-native'
import { useNavigation } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTheme } from '../lib/theme'
import PressableButton from './PressableButton'

const HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 12 }
const PRESS_RETENTION = { top: 24, bottom: 24, left: 24, right: 24 }

export default function HeaderBackButton() {
  const navigation = useNavigation()
  const { theme } = useTheme()

  if (!navigation.canGoBack()) return null

  return (
    <PressableButton
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={HIT_SLOP}
      pressRetentionOffset={PRESS_RETENTION}
      feedback="subtle"
      style={styles.touchable}
    >
      <Ionicons name="chevron-back" size={26} color={theme.colors.text.primary} />
    </PressableButton>
  )
}

const styles = StyleSheet.create({
  touchable: {
    width: 48,
    height: 48,
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
