// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/fixtures.ts'],
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/app/components/$1',
    '^@lib/(.*)$': '<rootDir>/app/lib/$1',
    '^@functions/(.*)$': '<rootDir>/functions/src/$1',
  },
  resolver: '<rootDir>/jest.resolver.js',
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'functions/src/**/*.ts',
    '!app/**/*.d.ts',
    '!app/lib/firebase-admin.ts',
    '!app/lib/transit.ts',
  ],
}

export default createJestConfig(config)
