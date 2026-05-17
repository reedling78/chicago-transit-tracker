'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { favoriteKey } from '@ctt/shared'
import { useAuth } from '@components/AuthProvider'
import { useFavoritesStore } from '@lib/store/favorites'
import { useLinesQuery, useStationsQuery } from '@lib/hooks/useDashboardQueries'
import { useReorderFavorites } from '@lib/hooks/useReorderFavorites'
import LineCard from './cards/LineCard'
import StationCard from './cards/StationCard'
import TrainCard from './cards/TrainCard'

export default function DashboardGrid() {
  const { user, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const { data: lines } = useLinesQuery()
  const { data: stations } = useStationsQuery()
  const { reorder } = useReorderFavorites()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = favorites.findIndex((f) => favoriteKey(f.type, f.id) === active.id)
    const toIndex = favorites.findIndex((f) => favoriteKey(f.type, f.id) === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    const newOrder = arrayMove(favorites, fromIndex, toIndex)
    reorder(newOrder)
  }

  if (loading || !user || favorites.length === 0) return null

  return (
    <div>
      <DndContext
        id="dashboard-grid"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={favorites.map((f) => favoriteKey(f.type, f.id))}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-4">
            {favorites.map((fav) => {
              if (fav.type === 'line') {
                return (
                  <LineCard
                    key={favoriteKey(fav.type, fav.id)}
                    favorite={fav}
                    line={(lines ?? []).find((l) => l.slug === fav.id)}
                    lines={lines}
                  />
                )
              }
              if (fav.type === 'station') {
                return (
                  <StationCard
                    key={favoriteKey(fav.type, fav.id)}
                    favorite={fav}
                    station={(stations ?? []).find((s) => s.slug === fav.id)}
                    lines={lines}
                  />
                )
              }
              return (
                <TrainCard
                  key={favoriteKey(fav.type, fav.id)}
                  favorite={fav}
                  lines={lines}
                  stations={stations}
                />
              )
            })}
          </ul>
        </SortableContext>
      </DndContext>
      <p className="mt-2 px-1 text-xs text-gray-500 italic dark:text-gray-400">
        Tip: drag a card to reorder. Click ⋯ for more options.
      </p>
    </div>
  )
}
