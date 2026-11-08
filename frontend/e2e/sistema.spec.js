// test y expect de ./sesion.js: cada página empieza con la sesión del DBA abierta.
import { API } from './apoyo.js';
import { expect, test } from './sesion.js';

// Pestaña Sistema del DBA: zonas, espacios, marcas y modelos.
//
// Las zonas y marcas que se crean aquí se quedan en la base de pruebas (la aplicación no las
// borra). Los espacios nuevos son de bicicleta y quedan habilitados: si otra prueba que corre
// en paralelo los elige, igual le sirven.

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Un piso del 60 al 79 y una letra que todavía no forman una zona. */
async function zonaLibre(request) {
  const respuesta = await request.get(`${API}/zonas`);
  const ocupadas = new Set((await respuesta.json()).map((z) => `${z.letra}${z.piso}`));
  for (let intento = 0; intento < 100; intento++) {
    const piso = String(60 + Math.floor(Math.random() * 20));
    const letra = LETRAS[Math.floor(Math.random() * LETRAS.length)];
    if (!ocupadas.has(`${letra}${piso}`)) {
      return { piso, letra, nombre: `${letra}${piso}` };
    }
  }
  throw new Error('No se encontró una zona libre en los pisos 60 a 79');
}

test('el DBA crea una zona en un piso nuevo, le agrega espacios y aparecen en el tablero', async ({
  page,
  request,
}) => {
  const zona = await zonaLibre(request);
  await page.goto('/sistema/zonas');
  await expect(page.getByRole('table', { name: 'Lista de zonas' })).toBeVisible();

  await page.getByRole('button', { name: 'Nueva zona' }).click();
  const nueva = page.getByRole('dialog', { name: 'Nueva zona' });
  await nueva.getByLabel('Piso').fill(zona.piso);
  await nueva.getByLabel('Letra').fill(zona.letra.toLowerCase());
  await nueva.getByLabel('Tipo de vehículo').selectOption({ label: 'Bicicleta' });
  await expect(nueva.getByRole('status')).toContainText(`Se creará la zona ${zona.nombre}`);
  await nueva.getByRole('button', { name: 'Crear zona' }).click();
  await expect(page.getByText(`Zona ${zona.nombre} creada`)).toBeVisible();

  await page.getByRole('button', { name: `Agregar espacios a la zona ${zona.nombre}` }).click();
  const agregar = page.getByRole('dialog', { name: `Agregar espacios a la zona ${zona.nombre}` });
  await agregar.getByLabel('Cantidad de espacios').fill('2');
  await expect(agregar.getByRole('status')).toContainText(`${zona.nombre}-01 a ${zona.nombre}-02`);
  await agregar.getByRole('button', { name: 'Agregar espacios' }).click();
  await expect(
    page.getByText(
      `Se agregaron 2 espacios a la zona ${zona.nombre}: ${zona.nombre}-01 a ${zona.nombre}-02.`,
    ),
  ).toBeVisible();

  // El piso y la zona nuevos aparecen solos en el tablero.
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Tablero' })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: `Piso ${zona.piso}` })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: `Zona ${zona.nombre}` })).toBeVisible();
});

test('el DBA agrega una marca y un modelo, y la marca no se puede repetir', async ({ page }) => {
  const marca = `Marca E2E ${Date.now().toString(36).toUpperCase()}`;
  await page.goto('/sistema/marcas');
  await expect(page.getByRole('table', { name: 'Lista de marcas' })).toBeVisible();

  await page.getByRole('button', { name: 'Nueva marca' }).click();
  let modal = page.getByRole('dialog', { name: 'Nueva marca' });
  await modal.getByLabel('Nombre').fill(marca);
  await modal.getByRole('button', { name: 'Crear marca' }).click();
  await expect(page.getByText(`Marca ${marca} creada.`)).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo modelo' }).click();
  modal = page.getByRole('dialog', { name: 'Nuevo modelo' });
  await modal.getByLabel('Marca').selectOption({ label: marca });
  await modal.getByLabel('Nombre').fill('Modelo Uno');
  await modal.getByRole('button', { name: 'Crear modelo' }).click();
  await expect(page.getByText(`Modelo ${marca} Modelo Uno creado.`)).toBeVisible();
  const fila = page.getByRole('row').filter({ hasText: marca });
  await expect(fila).toContainText('Modelo Uno');

  // La misma marca otra vez (en minúsculas): el backend responde 409 y se ve junto al nombre.
  await page.getByRole('button', { name: 'Nueva marca' }).click();
  modal = page.getByRole('dialog', { name: 'Nueva marca' });
  await modal.getByLabel('Nombre').fill(marca.toLowerCase());
  await modal.getByRole('button', { name: 'Crear marca' }).click();
  await expect(modal.getByText(/Ya existe una marca llamada/)).toBeVisible();
});
