import '@testing-library/jest-native/extend-expect'

// GitHub Actions runners are slow enough that the default 5s per-test
// timeout starves async `waitFor` calls when other suites are hogging
// workers (e.g. jest-expo's module-resolution cold-start). 15s keeps
// the local run fast while giving CI the headroom it needs.
jest.setTimeout(15000)

// AsyncStorage's native module isn't available in jest-expo by default.
// Provide an in-memory shim globally so any module that imports it (favorites
// store, Firebase Auth persistence) loads cleanly. Tests that need to assert
// on storage interactions can override this with their own mock.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>()
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v)
      }),
      removeItem: jest.fn(async (k: string) => {
        store.delete(k)
      }),
      clear: jest.fn(async () => store.clear()),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
    },
  }
})

// FavoriteButton transitively depends on TanStack Query, Firebase Auth, and
// the favorites Zustand store. Screen-level tests render PageHeader-using
// screens without those providers, so stub the component globally. The real
// FavoriteButton is unit-tested in its own file (which calls jest.unmock).
jest.mock('./components/FavoriteButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ type, id }: { type: string; id: string }) =>
      React.createElement(Text, { testID: 'favorite-button-stub' }, `${type}:${id}`),
  }
})

// react-native-gesture-handler ships no-op shims under jest-expo, but the
// GestureHandlerRootView native component still complains. Stub the package
// surface used in our app to a passthrough View.
jest.mock('react-native-gesture-handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  const Passthrough = ({ children, ...rest }: { children?: React.ReactNode }) =>
    React.createElement(View, rest, children)
  return {
    __esModule: true,
    GestureHandlerRootView: Passthrough,
    PanGestureHandler: Passthrough,
    TapGestureHandler: Passthrough,
    LongPressGestureHandler: Passthrough,
    Gesture: { Pan: () => ({}), Tap: () => ({}), LongPress: () => ({}) },
    GestureDetector: Passthrough,
    State: {},
    Directions: {},
  }
})

// react-native-reanimated provides a built-in jest mock; reach for it only
// in the test environment.
jest.mock('react-native-reanimated', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-reanimated/mock'),
)

// expo-haptics transitively pulls in expo's winter-runtime registry which
// trips the jest sandbox. We don't run real haptics in tests; stub the
// module entirely. PressableButton's own test imports the real expo-haptics
// (with a local mock) so this default doesn't impact unit-level coverage.
jest.mock('expo-haptics', () => ({
  __esModule: true,
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}))

// react-native-draggable-flatlist relies on reanimated worklets we don't
// exercise in jsdom. Replace it with a vanilla list that captures the
// onDragEnd callback so tests can drive reorder events directly.
jest.mock('react-native-draggable-flatlist', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  const captured = {}
  function DraggableFlatList(props) {
    const { data, renderItem, keyExtractor, onDragEnd, ListHeaderComponent, ListFooterComponent } =
      props
    captured.lastOnDragEnd = onDragEnd
    const renderSlot = (slot) => {
      if (!slot) return null
      if (React.isValidElement(slot)) return slot
      if (typeof slot === 'function') return React.createElement(slot)
      return null
    }
    return React.createElement(
      View,
      { testID: 'draggable-flatlist-stub' },
      renderSlot(ListHeaderComponent),
      ...data.map((item, index) =>
        React.createElement(
          View,
          { key: keyExtractor ? keyExtractor(item, index) : index },
          renderItem({ item, drag: () => {}, isActive: false }),
        ),
      ),
      renderSlot(ListFooterComponent),
    )
  }
  return {
    __esModule: true,
    default: DraggableFlatList,
    __captured: captured,
  }
})

// @gorhom/bottom-sheet renders contents inline through its provider/portal.
// Render contents directly so menu items are reachable in jsdom; expose
// present/dismiss as jest.fn so consumers can assert against them.
jest.mock('@gorhom/bottom-sheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  const Passthrough = React.forwardRef(function BottomSheetModalStub(
    { children, onDismiss }: { children?: React.ReactNode; onDismiss?: () => void },
    ref: React.Ref<unknown>,
  ) {
    const [open, setOpen] = React.useState(false)
    React.useImperativeHandle(ref, () => ({
      present: jest.fn(() => setOpen(true)),
      dismiss: jest.fn(() => {
        setOpen(false)
        onDismiss?.()
      }),
      snapToIndex: jest.fn(),
      close: jest.fn(() => {
        setOpen(false)
        onDismiss?.()
      }),
    }))
    return open ? React.createElement(View, { testID: 'bottom-sheet-modal' }, children) : null
  })
  const ContainerPassthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children)
  return {
    __esModule: true,
    BottomSheetModal: Passthrough,
    BottomSheetModalProvider: ContainerPassthrough,
    BottomSheetView: ContainerPassthrough,
    BottomSheetBackdrop: () => null,
  }
})
