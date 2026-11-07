import { expect, test } from '@playwright/test';
import { formatearPlaca } from '../src/utils/identificador.js';
import {
  crearVehiculo,
  espaciosLibresDesdeElFinal,
  esperarQueHayaCobro,
  registrarEntrada,
  sacarSiSigueDentro,
} from './apoyo.js';

// Pago en efectivo: el campo de referencia solo existe para PSE, Nequi y Daviplata.
test('salida en efectivo: no pide referencia y el recibo no la muestra', async ({
  page,
  request,
}) => {
  // Espera más de un minuto: el backend no cobra el primer minuto.
  test.setTimeout(240_000);
  // Preparación por la API: una moto nueva que entró a un espacio de motos.
  const moto = await crearVehiculo(request, 'Moto');
  try {
    const [espacio] = await espaciosLibresDesdeElFinal(request, 'Moto');
    const registro = await registrarEntrada(request, moto.identificador, espacio.idEspacio);
    await esperarQueHayaCobro(request, registro.idRegistro);

    await page.goto(`/salida/${registro.idRegistro}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Cobrar salida' })).toBeVisible();
    const referencia = page.getByRole('textbox', { name: 'Número de referencia' });

    // Con Nequi aparece el campo de referencia...
    await page.getByRole('radio', { name: 'Nequi' }).press('Space');
    await expect(referencia).toBeVisible();
    // ...y con efectivo desaparece.
    await page.getByRole('radio', { name: 'Efectivo' }).press('Space');
    await expect(page.getByRole('radio', { name: 'Efectivo' })).toBeChecked();
    await expect(referencia).toHaveCount(0);

    await page.getByRole('button', { name: 'Confirmar pago y salida' }).click();
    const dialogo = page.getByRole('dialog', { name: '¿Confirmar el pago y la salida?' });
    await expect(dialogo).toContainText('con Efectivo');
    await expect(dialogo).not.toContainText('referencia');
    await dialogo.getByRole('button', { name: 'Confirmar pago y salida' }).click();

    const recibo = page.getByRole('article', { name: 'Recibo de salida' });
    await expect(recibo).toContainText(formatearPlaca(moto.identificador));
    await expect(recibo).toContainText('Efectivo');
    await expect(recibo.getByText('Referencia', { exact: true })).toHaveCount(0);
  } finally {
    await sacarSiSigueDentro(request, moto.identificador);
  }
});
