import { test as base } from '@playwright/test';

// Las pantallas de la app y la API exigen sesión. Este `test` es el de Playwright con dos cambios,
// los dos con la sesión del DBA que abrió e2e/preparacion.js:
// - page: antes de cargar cada página pone esa sesión en sessionStorage (la misma clave que usa
//   src/api/sesionGuardada.js), así cada prueba empieza ya dentro de la app;
// - request: las llamadas directas a la API (las de e2e/apoyo.js para preparar datos) llevan su
//   token en Authorization.
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
  request: async ({ playwright }, usar) => {
    const contexto = await playwright.request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${sesionDba().token}` },
    });
    await usar(contexto);
    await contexto.dispose();
  },
});

export { expect } from '@playwright/test';
