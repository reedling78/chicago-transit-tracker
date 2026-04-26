'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteRoute } from '@lib/favoriteRoute'
import { useToggleFavorite } from '@lib/hooks/useToggleFavorite'

interface FavoriteMenuProps {
  favorite: Favorite
  lines: Line[] | undefined
  stations: Station[] | undefined
  onClose: () => void
}

export default function FavoriteMenu({ favorite, lines, stations, onClose }: FavoriteMenuProps) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const { toggle } = useToggleFavorite(favorite.type, favorite.id)
  const route = favoriteRoute(favorite, lines, stations)

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    // Defer adding the click-outside listener so the click that opened this
    // menu doesn't immediately close it.
    const timeout = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      window.clearTimeout(timeout)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Favorite actions"
      className="absolute top-full right-0 z-30 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <MenuItem
        label="Open details"
        disabled={!route}
        onSelect={() => {
          onClose()
          if (route) router.push(route)
        }}
      />
      <MenuItem label="Mute alerts" disabled title="Coming soon" onSelect={() => {}} />
      <MenuItem label="Share" disabled title="Coming soon" onSelect={() => {}} />
      <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
      <MenuItem
        label="Remove from favorites"
        destructive
        onSelect={() => {
          onClose()
          toggle()
        }}
      />
    </div>
  )
}

interface MenuItemProps {
  label: string
  onSelect: () => void
  disabled?: boolean
  destructive?: boolean
  title?: string
}

function MenuItem({ label, onSelect, disabled, destructive, title }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      disabled={disabled}
      title={title}
      className={[
        'block w-full px-4 py-2 text-left text-sm transition',
        disabled
          ? 'cursor-not-allowed text-gray-400 dark:text-gray-500'
          : destructive
            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
