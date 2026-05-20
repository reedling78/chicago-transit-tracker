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
import { dashboardItemKey } from '@ctt/shared'
import { useAuth } from '@components/AuthProvider'
import { useDashboardStore } from '@lib/store/dashboard'
import { useLinesQuery, useStationsQuery } from '@lib/hooks/useDashboardQueries'
import { useReorderDashboardItems } from '@lib/hooks/useReorderDashboardItems'
import LineCard from './cards/LineCard'
import StationCard from './cards/StationCard'
import TrainCard from './cards/TrainCard'

export default function DashboardGrid() {
  const { user, loading } = useAuth()
  const items = useDashboardStore((s) => s.items)
  const { data: lines } = useLinesQuery()
  const { data: stations } = useStationsQuery()
  const { reorder } = useReorderDashboardItems()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = items.findIndex((i) => dashboardItemKey(i.type, i.id) === active.id)
    const toIndex = items.findIndex((i) => dashboardItemKey(i.type, i.id) === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    const newOrder = arrayMove(items, fromIndex, toIndex)
    reorder(newOrder)
  }

  if (loading || !user || items.length === 0) return null

  return (
    <div>
      <DndContext
        id="dashboard-grid"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => dashboardItemKey(i.type, i.id))}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-4">
            {items.map((item) => {
              if (item.type === 'line') {
                return (
                  <LineCard
                    key={dashboardItemKey(item.type, item.id)}
                    item={item}
                    line={(lines ?? []).find((l) => l.slug === item.id)}
                    lines={lines}
                  />
                )
              }
              if (item.type === 'station') {
                return (
                  <StationCard
                    key={dashboardItemKey(item.type, item.id)}
                    item={item}
                    station={(stations ?? []).find((s) => s.slug === item.id)}
                    lines={lines}
                  />
                )
              }
              return (
                <TrainCard
                  key={dashboardItemKey(item.type, item.id)}
                  item={item}
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
