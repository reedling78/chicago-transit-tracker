import '@testing-library/jest-native/extend-expect'

// GitHub Actions runners are slow enough that the default 5s per-test
// timeout starves async `waitFor` calls when other suites are hogging
// workers (e.g. jest-expo's module-resolution cold-start). 15s keeps
// the local run fast while giving CI the headroom it needs.
jest.setTimeout(15000)
