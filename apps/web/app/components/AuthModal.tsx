'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signInWithGoogle,
  signInWithApple,
  signInWithFacebook,
} from '@lib/auth'

type Mode = 'signIn' | 'signUp' | 'resetPassword'

export default function AuthModal({
  onClose,
  initialMode = 'signIn',
}: {
  onClose: () => void
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      if (mode === 'resetPassword') {
        await resetPassword(email)
        setMessage('Check your email for a password reset link.')
        return
      }

      if (mode === 'signIn') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSocial(provider: 'google' | 'apple' | 'facebook') {
    setError('')
    try {
      if (provider === 'google') await signInWithGoogle()
      else if (provider === 'apple') await signInWithApple()
      else await signInWithFacebook()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {mode === 'signIn' && 'Sign In'}
            {mode === 'signUp' && 'Create Account'}
            {mode === 'resetPassword' && 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {mode !== 'resetPassword' && (
            <div>
              <label
                htmlFor="auth-password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'signIn'
                ? 'Sign In'
                : mode === 'signUp'
                  ? 'Create Account'
                  : 'Send Reset Email'}
          </button>
        </form>

        {mode !== 'resetPassword' && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-500 dark:text-gray-400">or continue with</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSocial('google')}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocial('apple')}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Apple
              </button>
              <button
                type="button"
                onClick={() => handleSocial('facebook')}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Facebook
              </button>
            </div>
          </>
        )}

        <div className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
          {mode === 'signIn' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('resetPassword')
                  setError('')
                  setMessage('')
                }}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Forgot password?
              </button>
              <span className="mx-2">·</span>
              <button
                type="button"
                onClick={() => {
                  setMode('signUp')
                  setError('')
                  setMessage('')
                }}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Create account
              </button>
            </>
          )}
          {mode === 'signUp' && (
            <button
              type="button"
              onClick={() => {
                setMode('signIn')
                setError('')
                setMessage('')
              }}
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Already have an account? Sign in
            </button>
          )}
          {mode === 'resetPassword' && (
            <button
              type="button"
              onClick={() => {
                setMode('signIn')
                setError('')
                setMessage('')
              }}
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
