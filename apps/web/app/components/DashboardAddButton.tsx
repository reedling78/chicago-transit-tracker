'use client'

import { useEffect, useRef, useState } from 'react'
import { useToggleDashboardItem } from '@lib/hooks/useToggleDashboardItem'
import { useAuth } from '@components/AuthProvider'
import { useDashboardStore } from '@lib/store/dashboard'
import AuthModal from '@components/AuthModal'
import type { DashboardItemType } from '@ctt/shared'

interface Props {
  type: DashboardItemType
  id: string
  className?: string
}

export default function DashboardAddButton({ type, id, className }: Props) {
  const { user } = useAuth()
  const { isOnDashboard, toggle, isToggling, needsAuth } = useToggleDashboardItem(type, id)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const pendingAddRef = useRef(false)

  useEffect(() => {
    if (user && pendingAddRef.current) {
      pendingAddRef.current = false
      if (!useDashboardStore.getState().has(type, id)) {
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

  const label = isOnDashboard ? 'Remove from dashboard' : 'Add to dashboard'

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isToggling}
        aria-label={label}
        aria-pressed={isOnDashboard}
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed ${
          isOnDashboard ? 'bg-white/20 hover:bg-white/25' : 'bg-black/40 hover:bg-black/55'
        } ${className ?? ''}`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {isOnDashboard ? (
            <polyline points="20 6 9 17 4 12" />
          ) : (
            <>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </>
          )}
        </svg>
        <span>{isOnDashboard ? 'On Dashboard' : 'Dashboard'}</span>
      </button>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
