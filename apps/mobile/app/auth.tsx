import { useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useNavHeaderInset } from '../lib/useNavHeaderInset'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signInWithApple,
  signInWithGoogle,
  signInWithFacebook,
} from '../lib/auth'

type Mode = 'signIn' | 'signUp' | 'resetPassword'

export default function AuthScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: string }>()
  const initialMode: Mode = params.mode === 'signUp' ? 'signUp' : 'signIn'
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!email.trim()) return
    setSubmitting(true)
    try {
      if (mode === 'resetPassword') {
        await resetPassword(email)
        Alert.alert('Success', 'Check your email for a password reset link.')
        setMode('signIn')
        return
      }
      if (mode === 'signIn') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password)
      }
      router.back()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSocial(provider: 'apple' | 'google' | 'facebook') {
    try {
      if (provider === 'apple') await signInWithApple()
      else if (provider === 'google') await signInWithGoogle()
      else await signInWithFacebook()
      router.back()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: headerInset + 8 }]}
    >
      <Text style={styles.title}>
        {mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Create Account' : 'Reset Password'}
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.text.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {mode !== 'resetPassword' && (
          <>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={theme.colors.text.muted}
              secureTextEntry
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.accent.primaryFg} />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'signIn'
                ? 'Sign In'
                : mode === 'signUp'
                  ? 'Create Account'
                  : 'Send Reset Email'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {mode !== 'resetPassword' && (
        <View style={styles.socialSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocial('apple')}>
              <Text style={styles.socialButtonText}>Sign in with Apple</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocial('google')}>
            <Text style={styles.socialButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocial('facebook')}>
            <Text style={styles.socialButtonText}>Sign in with Facebook</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        {mode === 'signIn' && (
          <>
            <TouchableOpacity onPress={() => setMode('resetPassword')}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('signUp')}>
              <Text style={styles.linkText}>Create account</Text>
            </TouchableOpacity>
          </>
        )}
        {mode === 'signUp' && (
          <TouchableOpacity onPress={() => setMode('signIn')}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        )}
        {mode === 'resetPassword' && (
          <TouchableOpacity onPress={() => setMode('signIn')}>
            <Text style={styles.linkText}>Back to sign in</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg.canvas },
    content: { padding: theme.space[6] },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text.primary,
      marginBottom: theme.space[8],
    },
    form: { gap: theme.space[3] },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.secondary,
      marginBottom: theme.space[1],
    },
    input: {
      backgroundColor: theme.colors.bg.surface,
      borderRadius: theme.radius.md - 2,
      padding: 14,
      fontSize: 16,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
    },
    button: {
      backgroundColor: theme.colors.accent.primary,
      borderRadius: theme.radius.md - 2,
      padding: 14,
      alignItems: 'center',
      marginTop: theme.space[2],
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: theme.colors.accent.primaryFg, fontSize: 16, fontWeight: '600' },
    socialSection: { marginTop: theme.space[6], gap: theme.space[3] },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      marginBottom: theme.space[1],
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border.subtle },
    dividerText: { color: theme.colors.text.muted, fontSize: 13 },
    socialButton: {
      backgroundColor: theme.colors.bg.surface,
      borderRadius: theme.radius.md - 2,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
    },
    socialButtonText: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '500' },
    footer: { marginTop: theme.space[6], alignItems: 'center', gap: theme.space[3] },
    linkText: { color: theme.colors.accent.primary, fontSize: 14 },
  })
}
