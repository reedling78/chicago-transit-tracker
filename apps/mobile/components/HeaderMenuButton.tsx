import { StyleSheet } from 'react-native'
import { useNavigation } from 'expo-router'
import { DrawerActions } from '@react-navigation/native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTheme } from '../lib/theme'
import PressableButton from './PressableButton'

export default function HeaderMenuButton() {
  const navigation = useNavigation()
  const { theme } = useTheme()
  return (
    <PressableButton
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      hitSlop={8}
      feedback="subtle"
      style={styles.touchable}
    >
      <Ionicons name="menu" size={28} color={theme.colors.text.primary} style={styles.icon} />
    </PressableButton>
  )
}

const styles = StyleSheet.create({
  touchable: { width: 44, height: 44, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
})
