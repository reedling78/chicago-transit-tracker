import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { useNavigation } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'

export default function HeaderBackButton() {
  const navigation = useNavigation()

  if (!navigation.canGoBack()) return null

  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      style={styles.touchable}
    >
      <View style={styles.circle}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  touchable: {
    width: 44,
    height: 44,
    marginLeft: 8,
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
