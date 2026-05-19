'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  listStationHeadsigns,
  type Favorite,
  type FavoriteDensity,
  type FavoriteDirection,
  type Line,
  type Station,
  type StationSchedule,
} from '@ctt/shared'
import { favoriteRoute } from '@lib/favoriteRoute'
import { useToggleFavorite } from '@lib/hooks/useToggleFavorite'
import { useUpdateFavoriteSettings } from '@lib/hooks/useUpdateFavoriteSettings'

interface FavoriteMenuProps {
  favorite: Favorite
  lines: Line[] | undefined
  stations: Station[] | undefined
  /** Schedule for the favorited station (if any). Used to populate CTA headsign chips. */
  schedule?: StationSchedule | null
  /**
   * Optional non-interactive header shown at the top of the menu. Train cards
   * pass the resolved "{origin} to {destination}" title plus "{line} #{number}"
   * so the menu identifies the trip without re-resolving stop data here.
   */
  header?: { title: string; subtitle: string }
  /**
   * Train favorites only. Invoked when the user picks "Set departure station…"
   * or "Set destination station…" — the TrainCard owns the picker modal state.
   * Items are hidden when this prop is omitted (e.g. trip data unavailable).
   */
  onSetTrainStop?: (which: 'origin' | 'destination') => void
  onClose: () => void
}

export default function FavoriteMenu({
  favorite,
  lines,
  stations,
  schedule,
  header,
  onSetTrainStop,
  onClose,
}: FavoriteMenuProps) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const { toggle } = useToggleFavorite(favorite.type, favorite.id)
  const { update } = useUpdateFavoriteSettings(favorite.type, favorite.id)
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
    const timeout = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      window.clearTimeout(timeout)
    }
  }, [onClose])

  const isStation = favorite.type === 'station'
  const station = isStation ? stations?.find((s) => s.slug === favorite.id) : undefined
  const isMetra = station?.service === 'metra' || station?.service === 'both'
  const density: FavoriteDensity = favorite.density ?? 'expanded'
  const direction: FavoriteDirection = favorite.directionFilter ?? 'all'

  const directionOptions: { key: FavoriteDirection; label: string }[] = isStation
    ? isMetra
      ? [
          { key: 'all', label: 'All' },
          { key: 'inbound', label: 'Inbound' },
          { key: 'outbound', label: 'Outbound' },
        ]
      : [
          { key: 'all', label: 'All' },
          ...listStationHeadsigns(schedule).map((headsign) => ({
            key: headsign,
            label: headsign,
          })),
        ]
    : []

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Favorite actions"
      className="absolute top-full right-0 z-30 mt-1 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      {header && (
        <div className="border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {header.title}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{header.subtitle}</p>
        </div>
      )}
      {isStation && (
        <>
          <ToggleRow
            label="View"
            options={[
              { key: 'expanded', label: 'Expanded' },
              { key: 'compact', label: 'Compact' },
            ]}
            active={density}
            onSelect={(value) => update({ density: value as FavoriteDensity })}
          />
          <ToggleRow
            label="Show"
            options={directionOptions}
            active={direction}
            onSelect={(value) => update({ directionFilter: value })}
          />
          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
        </>
      )}
      <MenuItem
        label="Open details"
        disabled={!route}
        onSelect={() => {
          onClose()
          if (route) router.push(route)
        }}
      />
      {favorite.type === 'train' && onSetTrainStop && (
        <>
          <MenuItem
            label="Set departure station…"
            onSelect={() => {
              onClose()
              onSetTrainStop('origin')
            }}
          />
          <MenuItem
            label="Set destination station…"
            onSelect={() => {
              onClose()
              onSetTrainStop('destination')
            }}
          />
        </>
      )}
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

interface ToggleRowProps<T extends string = string> {
  label: string
  options: { key: T; label: string }[]
  active: T
  onSelect: (value: T) => void
}

function ToggleRow<T extends string>({ label, options, active, onSelect }: ToggleRowProps<T>) {
  return (
    <div className="px-3 py-2">
      <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {label}
      </p>
      <div className="-mx-0.5 flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map((opt) => {
          const selected = opt.key === active
          return (
            <button
              key={opt.key}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              onClick={() => onSelect(opt.key)}
              className={[
                'rounded-md px-2 py-1 text-xs font-medium transition',
                selected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface MenuItemProps {
  label: string
  onSelect: () => void
  disabled?: boolean
  destructive?: boolean
}

function MenuItem({ label, onSelect, disabled, destructive }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      disabled={disabled}
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
