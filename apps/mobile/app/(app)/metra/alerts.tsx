import { View, ScrollView, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { useNavHeaderInset } from '../../../lib/useNavHeaderInset'
import { useTheme } from '../../../lib/theme'
import MetraAlerts from '../../../components/MetraAlerts'

export default function MetraAlertsScreen() {
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}>
      <Stack.Screen options={{ headerTitle: 'Service Alerts' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}>
        <MetraAlerts />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
})
