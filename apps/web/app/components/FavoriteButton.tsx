'use client'

import { useEffect, useRef, useState } from 'react'
import { useToggleFavorite } from '@lib/hooks/useToggleFavorite'
import { useAuth } from '@components/AuthProvider'
import { useFavoritesStore } from '@lib/store/favorites'
import AuthModal from '@components/AuthModal'
import type { FavoriteType } from '@ctt/shared'

interface Props {
  type: FavoriteType
  id: string
  className?: string
}

export default function FavoriteButton({ type, id, className }: Props) {
  const { user } = useAuth()
  const { isFavorited, toggle, isToggling, needsAuth } = useToggleFavorite(type, id)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const pendingAddRef = useRef(false)

  useEffect(() => {
    if (user && pendingAddRef.current) {
      pendingAddRef.current = false
      if (!useFavoritesStore.getState().has(type, id)) {
        toggle()
      }
    }
  }, [user, type, id, toggle])

  const handleClick = () => {
    if (needsAuth) {
      pendingAddRef.current = true
      setShowAuthModal(true)
      return
    }
    toggle()
  }

  const label = isFavorited ? 'Remove from favorites' : 'Add to favorites'

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isToggling}
        aria-label={label}
        aria-pressed={isFavorited}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed ${className ?? ''}`}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={isFavorited ? '#ef4444' : 'none'}
          stroke={isFavorited ? '#ef4444' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="transition-transform duration-150 active:scale-90"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
