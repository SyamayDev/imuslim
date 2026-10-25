import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: ['dist/**', 'dist-native/**', 'dist-native-full/**', 'android/**', 'legacy/**', 'motion/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'reports/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, __APP_VERSION__: 'readonly', __BUILD_DATE__: 'readonly', __SITE_URL__: 'readonly', __REPO_URL__: 'readonly', __PUSH_API__: 'readonly', __NATIVE__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    // Modul konteks (Provider + hook) memang mengekspor komponen dan hook bersamaan.
    files: ['src/app/audio.jsx', 'src/components/ui/Toast.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Entry prerender berjalan di Node saat build.
    files: ['src/entry-server.jsx'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Vercel Functions (Node.js)
    files: ['api/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
  },
  {
    files: ['api/**/*.test.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
  {
    files: ['scripts/**/*.mjs', 'e2e/**/*.js', '*.config.js', 'public/sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser, ...globals.serviceworker },
    },
    rules: { 'no-console': 'off' },
  },
];
