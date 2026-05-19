import { View, ScrollView, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { useNavHeaderInset } from '../../../lib/useNavHeaderInset'
import { useTheme } from '../../../lib/theme'
import CTAAlerts from '../../../components/CTAAlerts'

export default function CtaAlertsScreen() {
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}>
      <Stack.Screen options={{ headerTitle: 'Service Alerts' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}>
        <CTAAlerts />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
})
