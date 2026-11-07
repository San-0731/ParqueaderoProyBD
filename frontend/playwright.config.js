import { defineConfig, devices } from '@playwright/test';

// Pruebas de extremo a extremo (E2E) con Playwright: un Chromium real recorre la app.
// Uso: npm run test:e2e (ver "Pruebas de extremo a extremo" en el README).
//
// Antes de ejecutarlas deben estar encendidos MySQL y el backend APUNTANDO A LA BASE DE
// PRUEBAS, para no llenar de datos la base de desarrollo:
//   ./database/scripts/recrear-bd-pruebas.sh
//   cd backend && DB_NAME=parqueadero_test java -jar target/parqueadero-backend.jar
// El servidor de Vite lo enciende Playwright solo (webServer, más abajo).
export default defineConfig({
  testDir: './e2e',
  // Revisa que el backend responda antes de empezar.
  globalSetup: './e2e/preparacion.js',
  // Las pruebas que cobran esperan más de un minuto (el backend no cobra el primer minuto),
  // así que corren en paralelo. Cada una usa un tipo de vehículo o espacios distintos.
  fullyParallel: true,
  // 3 trabajadores: las pruebas largas se solapan entre sí y con las cortas. Más trabajadores
  // cargan demasiado una máquina de 4 núcleos (cada uno abre un Chromium y graba video).
  workers: 3,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    // Captura de pantalla, video y traza solo cuando una prueba falla.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  // Solo Chromium (es el único navegador instalado: npx playwright install chromium).
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    // Si ya hay un Vite encendido (npm run dev), lo reutiliza.
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
