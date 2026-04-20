import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '../lib/AuthContext'
import HeaderUserIcon from '../components/HeaderUserIcon'

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            headerRight: () => <HeaderUserIcon />,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ title: 'Sign In', presentation: 'modal' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        </Stack>
      </SafeAreaProvider>
    </AuthProvider>
  )
}
