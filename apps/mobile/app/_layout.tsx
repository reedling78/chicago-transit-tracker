import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { AuthProvider } from '../lib/AuthContext'
import { ThemeProvider, useTheme } from '../lib/theme'
import HeaderBackButton from '../components/HeaderBackButton'
import QueryProvider from '../components/QueryProvider'

function ThemedShell() {
  const { resolvedMode } = useTheme()
  return (
    <>
      <StatusBar style={resolvedMode === 'light' ? 'dark' : 'light'} />
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
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <BottomSheetModalProvider>
              <SafeAreaProvider>
                <ThemedShell />
              </SafeAreaProvider>
            </BottomSheetModalProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
