import { expect, test } from '@playwright/test';
import { API } from './apoyo.js';
import { CLAVE_SESION } from './sesion.js';

// Inicio y cierre de sesión por la pantalla. Usa el `test` original de Playwright (sin la sesión
// que pone e2e/sesion.js) y el DBA de arranque (DBA_USUARIO y DBA_CLAVE_INICIAL del .env).

const usuario = () => process.env.DBA_USUARIO;
const clave = () => process.env.DBA_CLAVE_INICIAL;

async function iniciarSesion(page, nombreUsuario, contrasena) {
  await page.getByLabel('Usuario').fill(nombreUsuario);
  await page.getByLabel('Contraseña').fill(contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test('sin sesión, una pantalla lleva al inicio y al entrar vuelve a ella', async ({ page }) => {
  await page.goto('/historial');

  await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
  await expect(page).toHaveTitle('Iniciar sesión | Parqueadero');
  await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);

  await iniciarSesion(page, usuario(), clave());

  await expect(
    page.getByRole('heading', { level: 1, name: 'Historial de parqueos' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/historial$/);
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  // El DBA ve todo el menú, incluido Reportes.
  await expect(page.getByRole('link', { name: 'Reportes' })).toBeVisible();
});

test('con la contraseña equivocada muestra el mensaje y no entra', async ({ page }) => {
  await page.goto('/');

  await iniciarSesion(page, usuario(), `${clave()}-mal`);

  await expect(page.getByRole('alert')).toContainText('Usuario o contraseña incorrectos.');
  await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
});

test('cerrar sesión vuelve al inicio y el token deja de servir', async ({ page, request }) => {
  await page.goto('/');
  await iniciarSesion(page, usuario(), clave());
  await expect(page.getByRole('heading', { level: 1, name: 'Tablero de espacios' })).toBeVisible();
  const token = await page.evaluate(
    (claveSesion) => JSON.parse(window.sessionStorage.getItem(claveSesion)).token,
    CLAVE_SESION,
  );

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
  const respuesta = await request.get(`${API}/auth/yo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(respuesta.status()).toBe(401);
});
