import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Chicago Transit Tracker' }} />
        <Stack.Screen name="cta/index" options={{ title: 'CTA Lines' }} />
        <Stack.Screen name="metra/index" options={{ title: 'Metra Lines' }} />
      </Stack>
    </SafeAreaProvider>
  )
}
