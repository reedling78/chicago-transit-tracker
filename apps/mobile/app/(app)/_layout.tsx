import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '../../lib/theme'
import HeaderBackButton from '../../components/HeaderBackButton'
import AppHeaderBackground from '../../components/AppHeaderBackground'

export default function AppStackLayout() {
  const { theme, resolvedMode } = useTheme()
  return (
    <>
      <StatusBar style={resolvedMode === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerBackground: () => <AppHeaderBackground />,
          headerShadowVisible: false,
          headerTitleAlign: 'left',
          headerTitleStyle: { color: theme.colors.text.primary, fontWeight: '700' },
          title: '',
          headerBackVisible: false,
          headerLeft: () => <HeaderBackButton />,
        }}
      >
        <Stack.Screen name="auth" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </>
  )
}
