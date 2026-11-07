import { expect, test } from '@playwright/test';

// Cada pantalla de la app carga con su título y sin errores en la consola del navegador.
const PANTALLAS = [
  ['/', 'Tablero de espacios'],
  ['/entrada', 'Registrar entrada'],
  ['/salida', 'Vehículos dentro'],
  ['/vehiculos', 'Vehículos y propietarios'],
  ['/historial', 'Historial de parqueos'],
  ['/reportes', 'Reportes'],
  ['/espacios', 'Administración de espacios'],
];

/** Guarda los errores de la consola y las excepciones no atrapadas de la página. */
function vigilarErrores(page) {
  const errores = [];
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') {
      errores.push(mensaje.text());
    }
  });
  page.on('pageerror', (error) => errores.push(String(error)));
  return errores;
}

for (const [ruta, titulo] of PANTALLAS) {
  test(`${ruta} carga "${titulo}" sin errores en la consola`, async ({ page }) => {
    const errores = vigilarErrores(page);

    await page.goto(ruta);

    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
    await expect(page).toHaveTitle(`${titulo} | Parqueadero`);
    // Espera a que terminen las consultas a la API de la pantalla.
    await page.waitForLoadState('networkidle');
    expect(errores, 'Errores en la consola del navegador').toEqual([]);
  });
}

test('una ruta que no existe muestra la página 404 con el enlace al tablero', async ({ page }) => {
  const errores = vigilarErrores(page);

  await page.goto('/esta-ruta-no-existe');

  await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible();
  await page.getByRole('link', { name: 'Ir al tablero' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tablero de espacios' })).toBeVisible();
  expect(errores).toEqual([]);
});
