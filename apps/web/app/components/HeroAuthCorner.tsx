'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from './AuthProvider'
import AuthModal from './AuthModal'

function firstName(profile: { displayName: string | null } | null): string | null {
  if (!profile?.displayName) return null
  return profile.displayName.split(' ')[0] || null
}

export default function HeroAuthCorner() {
  const { user, profile, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  if (loading) {
    return <div className="h-9" aria-hidden="true" />
  }

  if (user) {
    const display = firstName(profile) ?? 'Profile'
    return (
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        {profile?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoUrl} alt="" className="h-5 w-5 rounded-full" />
        ) : null}
        <span>{display}</span>
      </Link>
    )
  }

  return (
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
  )
}
