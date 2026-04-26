import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '../lib/AuthContext'
import HeaderBackButton from '../components/HeaderBackButton'
import QueryProvider from '../components/QueryProvider'

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerTransparent: true,
              headerStyle: { backgroundColor: 'transparent' },
              headerShadowVisible: false,
              title: '',
              headerBackVisible: false,
              headerLeft: () => <HeaderBackButton />,
            }}
          >
            <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          </Stack>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
