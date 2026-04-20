import { View, ScrollView, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import MetraAlerts from '../../components/MetraAlerts'

export default function MetraAlertsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Metra Alerts' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <MetraAlerts />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 16, paddingBottom: 32 },
})
