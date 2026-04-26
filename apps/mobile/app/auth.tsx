import { useState } from 'react'
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
import { useRouter } from 'expo-router'
import { useNavHeaderInset } from '../lib/useNavHeaderInset'
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
  const headerInset = useNavHeaderInset()
  const [mode, setMode] = useState<Mode>('signIn')
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
          placeholderTextColor="#666"
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
              placeholderTextColor="#666"
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
            <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  socialSection: {
    marginTop: 24,
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    fontSize: 13,
  },
  socialButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    color: '#60a5fa',
    fontSize: 14,
  },
})
