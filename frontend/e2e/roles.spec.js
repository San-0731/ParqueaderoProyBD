import { expect, test } from '@playwright/test';
import { crearUsuarioPorApi } from './apoyo.js';

// Lo que ve cada rol. Usa el `test` original de Playwright (sin la sesión del DBA): cada prueba
// crea su usuario por la API e inicia sesión por la pantalla.

async function entrarComo(page, { nombreUsuario, clave }) {
  await page.goto('/');
  await page.getByLabel('Usuario').fill(nombreUsuario);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tablero de espacios' })).toBeVisible();
}

const menu = (page) => page.getByRole('navigation', { name: 'Principal' });

test('el operador no ve Reportes ni Sistema, y Espacios es solo de consulta', async ({
  page,
  request,
}) => {
  await entrarComo(page, await crearUsuarioPorApi(request, 'OPERADOR'));

  await expect(menu(page).getByRole('link', { name: 'Entrada' })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Reportes' })).toHaveCount(0);
  await expect(menu(page).getByRole('link', { name: 'Sistema' })).toHaveCount(0);

  await menu(page).getByRole('link', { name: 'Espacios' }).click();
  await expect(
    page.getByText('Solo los administradores pueden habilitar o deshabilitar espacios.'),
  ).toBeVisible();
  const interruptores = page.getByRole('switch');
  await expect(interruptores.first()).toBeVisible();
  for (const interruptor of await interruptores.all()) {
    await expect(interruptor).toBeDisabled();
  }

  await page.goto('/reportes');
  await expect(page.getByRole('heading', { level: 1, name: 'Sin permiso' })).toBeVisible();
  await expect(page.getByText('Solo los administradores pueden ver los reportes.')).toBeVisible();
});

test('el administrador ve Reportes y puede usar Espacios, pero no ve Sistema', async ({
  page,
  request,
}) => {
  await entrarComo(page, await crearUsuarioPorApi(request, 'ADMINISTRADOR'));

  await expect(menu(page).getByRole('link', { name: 'Sistema' })).toHaveCount(0);
  await menu(page).getByRole('link', { name: 'Reportes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Reportes' })).toBeVisible();

  await menu(page).getByRole('link', { name: 'Espacios' }).click();
  await expect(page.getByRole('switch').first()).toBeEnabled();

  await page.goto('/sistema');
  await expect(page.getByText('Solo el DBA puede administrar el sistema.')).toBeVisible();
});

test('el DBA crea un usuario en Sistema y ese usuario puede entrar', async ({ page, request }) => {
  await entrarComo(page, await crearUsuarioPorApi(request, 'DBA'));
  const nombreUsuario = `e2e_nuevo_${Date.now().toString(36)}`;

  await menu(page).getByRole('link', { name: 'Sistema' }).click();
  await expect(page.getByRole('table', { name: 'Lista de usuarios' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  const modal = page.getByRole('dialog', { name: 'Nuevo usuario' });
  await modal.getByLabel('Nombre de usuario').fill(nombreUsuario);
  await modal.getByLabel('Nombre completo').fill('Operador Creado En E2E');
  await modal.getByLabel('Rol').selectOption('OPERADOR');
  await modal.getByLabel('Contraseña inicial').fill('clave-inicial-e2e');
  await modal.getByRole('button', { name: 'Crear usuario' }).click();

  await expect(page.getByText(`Usuario ${nombreUsuario} creado.`, { exact: false })).toBeVisible();
  await expect(page.getByRole('cell', { name: nombreUsuario, exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByLabel('Usuario').fill(nombreUsuario);
  await page.getByLabel('Contraseña').fill('clave-inicial-e2e');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('Operador Creado En E2E')).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Reportes' })).toHaveCount(0);
});
