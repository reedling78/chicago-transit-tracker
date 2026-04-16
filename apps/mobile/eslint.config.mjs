import { defineConfig, globalIgnores } from 'eslint/config'
import expoConfig from 'eslint-config-expo/flat.js'
import prettierConfig from 'eslint-config-prettier'

export default defineConfig([
  ...expoConfig,
  prettierConfig,
  globalIgnores([
    '.expo/**',
    'android/**',
    'ios/**',
    'node_modules/**',
    'scripts/**',
    'babel.config.js',
    'metro.config.js',
  ]),
])
