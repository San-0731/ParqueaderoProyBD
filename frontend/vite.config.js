import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

// Configuración de Vite (servidor de desarrollo y compilación) y de Vitest (pruebas).
// https://vite.dev/config/ y https://vitest.dev/config/
export default defineConfig({
  // react: JSX y recarga en caliente. tailwindcss: genera el CSS de las clases usadas.
  plugins: [react(), tailwindcss()],
  test: {
    // jsdom simula el navegador (document, window) para poder renderizar componentes.
    environment: 'jsdom',
    // describe, it, expect y vi disponibles sin importarlos; Testing Library también
    // los usa para limpiar el DOM después de cada prueba.
    globals: true,
    // Se ejecuta antes de cada archivo de pruebas (agrega los matchers de jest-dom).
    setupFiles: './src/setupTests.js',
    // e2e/ son las pruebas de Playwright (npm run test:e2e): Vitest no las ejecuta.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    // npm run test:cobertura: qué líneas del código ejecutan las pruebas. El
    // reporte sale en la terminal y en coverage/index.html (no se versiona).
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/setupTests.js', 'src/main.jsx', 'src/test/**'],
    },
  },
});
