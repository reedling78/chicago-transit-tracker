/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>', '<rootDir>/../../packages/shared'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@ctt/shared$': '<rootDir>/../../packages/shared/src',
    '^@ctt/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    // jest-expo@54 bundles its runtime against jest@29; under jest@30 the
    // lazy `require()` in expo/src/winter/runtime.native.ts triggers a
    // "file outside scope" sandbox error. We don't need the WinterCG
    // polyfills at test time, so stub the module entirely.
    '^expo/src/winter$': '<rootDir>/__mocks__/expo-winter-runtime.js',
    '^expo/src/winter/runtime(\\.native)?$': '<rootDir>/__mocks__/expo-winter-runtime.js',
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient',
  },
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/fixtures.ts'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!lib/firebase.ts',
  ],
}
