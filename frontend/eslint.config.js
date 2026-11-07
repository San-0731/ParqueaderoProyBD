import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

// Reglas de calidad del código (npm run lint). El formato lo maneja Prettier.
export default defineConfig([
  // Archivos generados: dist (compilación), coverage (npm run test:cobertura) y los
  // resultados de Playwright (npm run test:e2e).
  globalIgnores(['dist', 'coverage', 'test-results', 'playwright-report']),
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
  },
  {
    // En las pruebas, describe, it, expect y vi son globales (globals: true en vite.config.js).
    files: ['**/*.test.{js,jsx}', 'src/setupTests.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
    },
  },
  {
    // Las pruebas E2E y la configuración de Playwright corren en Node (process, fetch...).
    files: ['e2e/**/*.js', 'playwright.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
]);
