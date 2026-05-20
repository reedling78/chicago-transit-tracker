import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../lib/theme'
import HeaderBackButton from '../../components/HeaderBackButton'
import { headerLeftItem } from '../../lib/headerItems'

export default function AppStackLayout() {
  const { theme, resolvedMode } = useTheme()
  return (
    <>
      <StatusBar style={resolvedMode === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerTransparent: false,
          headerStyle: { backgroundColor: theme.colors.bg.canvas },
          headerShadowVisible: false,
          headerTitleAlign: 'left',
          headerTitleStyle: { color: theme.colors.text.primary, fontWeight: '700' },
          title: '',
          headerBackVisible: false,
          headerBackground: () => (
            <View style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.colors.border.hairline,
                }}
              />
            </View>
          ),
          ...headerLeftItem(<HeaderBackButton />),
        }}
      >
        <Stack.Screen name="auth" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </>
  )
}
