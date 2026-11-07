import { test as base } from '@playwright/test';

// Las pantallas de la app exigen sesión. Este `test` es el de Playwright con un cambio: antes de
// cargar cada página pone en sessionStorage la sesión del DBA que abrió e2e/preparacion.js (la
// misma clave que usa src/api/sesionGuardada.js). Así cada prueba empieza ya dentro de la app.
//
// Las pruebas del inicio de sesión mismo (sesion.spec.js) usan el `test` original, sin sesión.

/** Clave de la sesión en sessionStorage (src/api/sesionGuardada.js). */
export const CLAVE_SESION = 'parqueadero.sesion';

/** La sesión del DBA: { token, usuario }. */
export function sesionDba() {
  return JSON.parse(process.env.E2E_SESION_DBA);
}

export const test = base.extend({
  // El segundo parámetro de un fixture se suele llamar `use`; aquí se llama `usar` para que
  // ESLint no lo confunda con el hook use() de React.
  page: async ({ page }, usar) => {
    await page.addInitScript(
      ([clave, valor]) => window.sessionStorage.setItem(clave, valor),
      [CLAVE_SESION, process.env.E2E_SESION_DBA],
    );
    await usar(page);
  },
});

export { expect } from '@playwright/test';
