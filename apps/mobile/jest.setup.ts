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
