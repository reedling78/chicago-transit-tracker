'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@components/AuthProvider'
import AuthModal from '@components/AuthModal'

function firstName(profile: { displayName: string | null } | null): string | null {
  if (!profile?.displayName) return null
  return profile.displayName.split(' ')[0] || null
}

export default function DashboardHeader() {
  const { user, profile, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  if (loading) {
    return <header className="mb-6 h-12" aria-hidden="true" />
  }

  const greeting = user
    ? firstName(profile)
      ? `Welcome back, ${firstName(profile)}`
      : 'Welcome back'
    : 'Chicago Transit Tracker'

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
        {greeting}
      </h1>
      {user ? (
        <Link
          href="/profile"
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Profile
        </Link>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Sign in
          </button>
          {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </>
      )}
    </header>
  )
}
