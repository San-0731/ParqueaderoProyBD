import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

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
  },
});
