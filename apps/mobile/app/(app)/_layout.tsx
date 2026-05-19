import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '../../lib/theme'
import HeaderBackButton from '../../components/HeaderBackButton'

export default function AppStackLayout() {
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
