import { expect, test } from '@playwright/test';
import { crearUsuarioPorApi, ESPERA_CONTRASENA, registrarCarroComo, tokenPorApi } from './apoyo.js';
import { sesionDba } from './sesion.js';

// Auditoría de punta a punta: un operador registra un carro por la API real (el backend pasa
// su usuario a MySQL y los triggers lo anotan) y un administrador lo ve en la pantalla.
// Usa el `test` original (sin la sesión del DBA en la página).

test('el administrador ve en Auditoría el vehículo que registró un operador', async ({
  page,
  request,
}) => {
  // Las consultas de apoyo (placa y documento libres) usan la sesión del DBA.
  const conDba = { Authorization: `Bearer ${sesionDba().token}` };
  const peticiones = {
    get: (url, opciones = {}) => request.get(url, { ...opciones, headers: conDba }),
    post: (url, opciones = {}) =>
      request.post(url, { ...opciones, headers: { ...conDba, ...opciones.headers } }),
  };
  const operador = await crearUsuarioPorApi(request, 'OPERADOR');
  const placa = await registrarCarroComo(peticiones, await tokenPorApi(request, operador));
  const placaVisible = `${placa.slice(0, 3)} ${placa.slice(3)}`;
  const administrador = await crearUsuarioPorApi(request, 'ADMINISTRADOR');

  await page.goto('/auditoria');
  await page.getByLabel('Usuario').fill(administrador.nombreUsuario);
  await page.getByLabel('Contraseña').fill(administrador.clave);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Auditoría' })).toBeVisible(
    ESPERA_CONTRASENA,
  );

  await page.getByLabel('Sección').selectOption({ label: 'Vehículos' });
  const fila = page.getByRole('row').filter({ hasText: placaVisible });
  await expect(fila).toContainText('Registró un vehículo');
  await expect(fila).toContainText(operador.nombreUsuario);
  await expect(fila).toContainText('Operador');
});
