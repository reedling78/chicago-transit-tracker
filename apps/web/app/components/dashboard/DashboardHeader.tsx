'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@components/AuthProvider'
import { useFavoritesStore } from '@lib/store/favorites'
import AuthModal from '@components/AuthModal'

type AuthOpen = 'signIn' | 'signUp' | null

export default function DashboardHeader() {
  const { user, profile, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const [authOpen, setAuthOpen] = useState<AuthOpen>(null)

  if (loading) return null

  if (!user) {
    return (
      <>
        <section className="relative -mx-4 -mt-8 mb-12 overflow-hidden bg-gray-50 px-4 py-20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:bg-gray-950">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(120,119,198,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(120,119,198,0.15),transparent)]" />

          <div className="relative mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
              Chicago Transit Tracker
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl dark:text-white/70">
              Real-time schedules, routes, and station info for every line in the Chicago metro
              area.
            </p>
            <p className="mt-10 text-base text-gray-600 dark:text-white/70">
              Sign up to customize your dashboard with your favorite lines, stations, and trains.
            </p>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setAuthOpen('signUp')}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => setAuthOpen('signIn')}
                className="w-full rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 sm:w-auto dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
              >
                Log in
              </button>
            </div>
          </div>
        </section>
        {authOpen && <AuthModal onClose={() => setAuthOpen(null)} initialMode={authOpen} />}
      </>
    )
  }

  const firstName = profile?.displayName?.split(' ')[0]
  const heading = firstName ? `Welcome back, ${firstName}` : 'Your Dashboard'

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">{heading}</h2>
      {favorites.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="font-medium text-gray-900 dark:text-white">No favorites yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tap the heart on any line, station, or train to save it here. Or jump in below:
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link
              href="/cta"
              className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:border-gray-600"
            >
              Browse CTA →
            </Link>
            <Link
              href="/metra"
              className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:border-gray-600"
            >
              Browse Metra →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
