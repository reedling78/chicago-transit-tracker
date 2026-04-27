'use client'

import { useAuth } from '@components/AuthProvider'
import { signOut } from '@lib/auth'
import { useState } from 'react'
import AuthModal from '@components/AuthModal'
import FavoritesManager from '@components/profile/FavoritesManager'

export default function ProfileContent() {
  const { user, profile, loading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">Sign in to view your profile.</p>
        <button
          onClick={() => setShowAuth(true)}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Sign In
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    )
  }

  const providerLabels: Record<string, string> = {
    apple: 'Apple',
    google: 'Google',
    facebook: 'Facebook',
    password: 'Email & Password',
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
            <dd className="mt-1 text-gray-900 dark:text-white">{profile.email || 'Not set'}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Sign-in Provider
            </dt>
            <dd className="mt-1 text-gray-900 dark:text-white">
              {providerLabels[profile.provider] || profile.provider}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</dt>
            <dd className="mt-1 text-gray-900 dark:text-white">
              {new Date(profile.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
        </div>

        <hr className="my-6 border-gray-200 dark:border-gray-700" />

        <button
          onClick={() => signOut()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>

      <FavoritesManager />
    </div>
  )
}
