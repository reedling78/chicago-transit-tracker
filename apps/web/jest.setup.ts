// jest.setup.ts
import '@testing-library/jest-dom'

// jest-environment-jsdom v29 doesn't expose Node's native fetch / Headers /
// Request / Response on globalThis, but @firebase/auth's Node platform shim
// references them at module load. Stub them so transitive imports of
// firebase/auth don't crash. Tests that actually call fetch (e.g. polling
// components) mock it themselves.
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = (() =>
    Promise.reject(new Error('fetch not mocked in this test'))) as typeof fetch
}
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class StubResponse {} as unknown as typeof Response
}
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class StubRequest {} as unknown as typeof Request
}
if (typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = class StubHeaders {} as unknown as typeof Headers
}

// FavoriteButton transitively depends on TanStack Query (useToggleFavorite ->
// useMutation), Firebase Auth, and the favorites Zustand store. Page-level
// tests render PageHeader-using pages without those providers, so stub the
// component globally. The real FavoriteButton is unit-tested in its own file
// (which calls jest.unmock).
jest.mock('@components/FavoriteButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  return {
    __esModule: true,
    default: ({ type, id }: { type: string; id: string }) =>
      React.createElement('div', {
        'data-testid': 'favorite-button-stub',
        'data-favorite-type': type,
        'data-favorite-id': id,
      }),
  }
})

// @dnd-kit relies on PointerEvent / pointer capture which jsdom doesn't model.
// Replace it with a thin stub that captures `onDragEnd` so tests can drive
// reorder events directly without simulating gestures.
jest.mock('@dnd-kit/core', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  type DragEndEvent = { active: { id: string }; over: { id: string } | null }
  const captured: { lastOnDragEnd?: (e: DragEndEvent) => void } = {}
  return {
    __esModule: true,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children?: React.ReactNode
      onDragEnd?: (e: DragEndEvent) => void
    }) => {
      captured.lastOnDragEnd = onDragEnd
      return React.createElement(React.Fragment, null, children)
    },
    DragOverlay: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    PointerSensor: class {},
    TouchSensor: class {},
    KeyboardSensor: class {},
    useSensor: () => ({}),
    useSensors: () => [],
    closestCenter: () => null,
    __captured: captured,
  }
})

jest.mock('@dnd-kit/sortable', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const copy = [...arr]
    const [item] = copy.splice(from, 1)
    copy.splice(to, 0, item)
    return copy
  }
  return {
    __esModule: true,
    SortableContext: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: null,
      isDragging: false,
    }),
    arrayMove,
    sortableKeyboardCoordinates: () => null,
    verticalListSortingStrategy: () => null,
  }
})

jest.mock('@dnd-kit/utilities', () => ({
  __esModule: true,
  CSS: {
    Transform: { toString: () => '' },
    Translate: { toString: () => '' },
  },
}))
