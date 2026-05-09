import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '../lib/theme'
import { completeAppleSignInFromCallback } from '../lib/auth'

// Receives the deep link from the Apple OAuth web bridge
// (https://chicagotransittracker.com/api/apple-redirect → ctt://apple-callback?…)
// when Android intent-dispatches the URL to the app instead of letting
// expo-web-browser's in-session listener intercept it. Forwards the params
// to the in-flight signInWithApple() call and bounces back to the home tab.
export default function AppleCallbackScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>()
  const { theme } = useTheme()

  useEffect(() => {
    const flat: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string') flat[k] = v
      else if (Array.isArray(v)) flat[k] = v[0]
    }
    completeAppleSignInFromCallback(flat)
      .catch(() => {
        // The pending sign-in already surfaces this rejection to the caller of
        // signInWithApple (which shows the user-facing Alert). Swallow here
        // so we don't get an unhandled promise rejection.
      })
      .finally(() => {
        router.replace('/')
      })
  }, [params, router])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}>
        <ActivityIndicator color={theme.colors.accent.primary} />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})
