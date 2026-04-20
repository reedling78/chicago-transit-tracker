import { View, ScrollView, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import CTAAlerts from '../../../components/CTAAlerts'

export default function CtaAlertsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'CTA Alerts' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <CTAAlerts />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 16, paddingBottom: 32 },
})
