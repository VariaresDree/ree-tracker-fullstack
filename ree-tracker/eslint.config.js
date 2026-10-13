import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // A const read above its declaration in the same scope throws on the
      // first render (a hook reading state it declares further down took
      // the Question bank down). References from inner functions run later,
      // so they stay allowed.
      'no-use-before-define': ['error', { functions: false, classes: false, variables: false }],
    },
  },
  {
    // Build config, scripts and tests run in Node (vitest), not the browser:
    // `process` and `__dirname` there are real, not undefined.
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,mjs}', '**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
])
