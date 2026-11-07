// test y expect de ./sesion.js: cada página empieza con la sesión del DBA abierta.
import { expect, test } from './sesion.js';
import {
  API,
  crearVehiculo,
  espaciosLibresDesdeElFinal,
  esperarQueHayaCobro,
  registrarEntrada,
  sacarSiSigueDentro,
} from './apoyo.js';

// Mensajes de error que ve el operario. Cada prueba usa un tipo de vehículo distinto para no
// competir por los espacios cuando corren en paralelo.

/** Busca la placa en la pantalla de entrada. */
async function buscarEnEntrada(page, identificador) {
  await page.goto('/entrada');
  await page.getByRole('textbox', { name: 'Placa o código' }).fill(identificador);
  await page.getByRole('button', { name: 'Buscar' }).click();
}

test('un vehículo que ya está dentro: la entrada lo avisa y no deja confirmar', async ({
  page,
  request,
}) => {
  const bicicleta = await crearVehiculo(request, 'Bicicleta');
  try {
    const [espacio] = await espaciosLibresDesdeElFinal(request, 'Bicicleta');
    await registrarEntrada(request, bicicleta.identificador, espacio.idEspacio);

    await buscarEnEntrada(page, bicicleta.identificador);

    await expect(page.getByText('Este vehículo ya está dentro')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar entrada' })).toBeDisabled();
  } finally {
    await sacarSiSigueDentro(request, bicicleta.identificador);
  }
});

test('si otro operario lo registró mientras tanto, muestra el mensaje del backend (409)', async ({
  page,
  request,
}) => {
  const carro = await crearVehiculo(request, 'Carro');
  try {
    await buscarEnEntrada(page, carro.identificador);
    // En pantalla se elige el último espacio libre (el flujo completo usa el primero).
    const espacios = page.getByRole('group', { name: 'Espacios libres para Carro' });
    await espacios.getByRole('radio').last().press('Space');

    // Mientras tanto, otro operario registra la entrada del mismo carro en otro espacio.
    const [, otroEspacio] = await espaciosLibresDesdeElFinal(request, 'Carro');
    await registrarEntrada(request, carro.identificador, otroEspacio.idEspacio);

    await page.getByRole('button', { name: 'Confirmar entrada' }).click();

    const alerta = page.getByRole('alert').filter({ hasText: 'No se pudo registrar la entrada' });
    await expect(alerta).toContainText('El vehículo ya tiene un parqueo activo.');
  } finally {
    await sacarSiSigueDentro(request, carro.identificador);
  }
});

test('con PSE no se puede confirmar la salida sin la referencia', async ({ page, request }) => {
  // Espera más de un minuto: sin cobro la pantalla no pide método de pago.
  test.setTimeout(240_000);
  const camion = await crearVehiculo(request, 'Camión');
  try {
    const [espacio] = await espaciosLibresDesdeElFinal(request, 'Camión');
    const registro = await registrarEntrada(request, camion.identificador, espacio.idEspacio);
    await esperarQueHayaCobro(request, registro.idRegistro);

    await page.goto(`/salida/${registro.idRegistro}`);
    await page.getByRole('radio', { name: 'PSE' }).press('Space');
    await page.getByRole('button', { name: 'Confirmar pago y salida' }).click();

    const referencia = page.getByRole('textbox', { name: 'Número de referencia' });
    await expect(referencia).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.getByText('El pago con PSE requiere la referencia (código de la transacción).'),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // El parqueo sigue abierto: no se registró nada.
    const activos = await (
      await request.get(`${API}/registros/activos?identificador=${camion.identificador}`)
    ).json();
    expect(activos.map((activo) => activo.idRegistro)).toContain(registro.idRegistro);
  } finally {
    await sacarSiSigueDentro(request, camion.identificador);
  }
});
