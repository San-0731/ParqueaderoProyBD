import { expect, test } from '@playwright/test';
import { formatearPesos } from '../src/utils/formato.js';
import { formatearPlaca } from '../src/utils/identificador.js';
import {
  API,
  documentoLibre,
  esperarQueHayaCobro,
  placaLibre,
  sacarSiSigueDentro,
} from './apoyo.js';

// El recorrido completo del enunciado en el navegador: registrar un carro y su propietario
// nuevos al entrar, verlo ocupando su espacio en el tablero, cobrar la salida con Nequi,
// entregar el recibo, encontrarlo en el historial y ver el espacio libre otra vez.
test('carro y propietario nuevos: entrada, cobro con Nequi, recibo, historial y espacio libre', async ({
  page,
  request,
}) => {
  // Espera más de un minuto: el backend no cobra el primer minuto.
  test.setTimeout(240_000);
  const placa = await placaLibre(request, 'Carro');
  const placaVisible = formatearPlaca(placa);
  const documento = await documentoLibre(request);
  const referencia = `E2E-NEQ-${placa}`;
  let codigoEspacio;
  let rutaSalida;

  try {
    await test.step('Entrada: registrar el carro y su propietario nuevos', async () => {
      await page.goto('/entrada');
      // Se escribe en minúsculas: la pantalla la normaliza.
      await page.getByRole('textbox', { name: 'Placa o código' }).fill(placa.toLowerCase());
      await page.getByRole('button', { name: 'Buscar' }).click();
      await expect(page.getByText(`El vehículo ${placaVisible} no está registrado.`)).toBeVisible();

      await page.getByRole('textbox', { name: 'Documento del propietario' }).fill(documento);
      await page.getByRole('button', { name: 'Buscar propietario' }).click();
      await expect(
        page.getByText(`No hay un propietario con el documento ${documento}.`),
      ).toBeVisible();
      await page.getByRole('textbox', { name: 'Nombres' }).fill('Ana María');
      await page.getByRole('textbox', { name: 'Apellidos' }).fill('Prueba Núñez');
      await page.getByRole('button', { name: 'Registrar vehículo' }).click();

      // El primer espacio libre para carro. El radio está escondido dentro de su casilla
      // (como en un formulario accesible): se elige con el teclado, igual que un operario.
      const espacio = page
        .getByRole('group', { name: 'Espacios libres para Carro' })
        .getByRole('radio')
        .first();
      const nombreEspacio = await espacio.getAttribute('aria-label'); // "A-01, piso 1"
      codigoEspacio = nombreEspacio.split(',')[0];
      await espacio.press('Space');
      await expect(espacio).toBeChecked();
      await page.getByRole('button', { name: 'Confirmar entrada' }).click();
      await expect(
        page.getByText(`Entrada registrada: ${placaVisible} en ${nombreEspacio}`),
      ).toBeVisible();
    });

    await test.step('Tablero: el espacio aparece ocupado por el carro', async () => {
      await page.goto('/');
      const casilla = page.getByRole('link', {
        name: new RegExp(`^${codigoEspacio} ${placaVisible} .*ocupado`),
      });
      await expect(casilla).toBeVisible();
      rutaSalida = await casilla.getAttribute('href'); // /salida/{idRegistro}
    });

    const idRegistro = Number(rutaSalida.split('/').pop());
    await esperarQueHayaCobro(request, idRegistro);
    const liquidacion = await (
      await request.get(`${API}/registros/${idRegistro}/liquidacion`)
    ).json();
    const valor = formatearPesos(liquidacion.valorTotal);

    await test.step('Salida: cobrar con Nequi y la referencia', async () => {
      await page.goto('/');
      await page
        .getByRole('link', { name: new RegExp(`^${codigoEspacio} ${placaVisible} `) })
        .click();
      await expect(page.getByRole('heading', { level: 1, name: 'Cobrar salida' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Cuenta' })).toContainText(valor);

      await page.getByRole('radio', { name: 'Nequi' }).press('Space');
      await page.getByRole('textbox', { name: 'Número de referencia' }).fill(referencia);
      await page.getByRole('button', { name: 'Confirmar pago y salida' }).click();
      const dialogo = page.getByRole('dialog', { name: '¿Confirmar el pago y la salida?' });
      await expect(dialogo).toContainText(`con Nequi, referencia ${referencia}`);
      await dialogo.getByRole('button', { name: 'Confirmar pago y salida' }).click();
    });

    await test.step('Recibo: muestra el valor, el método y la referencia', async () => {
      await expect(
        page.getByRole('heading', { level: 1, name: 'Salida registrada' }),
      ).toBeVisible();
      const recibo = page.getByRole('article', { name: 'Recibo de salida' });
      await expect(recibo).toContainText(placaVisible);
      await expect(recibo).toContainText(valor);
      await expect(recibo).toContainText('Nequi');
      await expect(recibo).toContainText(referencia);
    });

    await test.step('Historial: el parqueo aparece con su método y referencia', async () => {
      await page.goto('/historial');
      await page.getByRole('searchbox', { name: 'Placa o código' }).fill(placa);
      const fila = page.getByRole('row', { name: new RegExp(`^${placaVisible} `) });
      await expect(fila).toContainText('Nequi');
      await expect(fila).toContainText(referencia);
      await expect(fila).toContainText(valor);
    });

    await test.step('Tablero: el espacio vuelve a estar libre', async () => {
      await page.goto('/');
      await expect(
        page.getByRole('link', { name: new RegExp(`^${codigoEspacio} Libre`) }),
      ).toBeVisible();
    });
  } finally {
    // Si la prueba falló a mitad de camino, libera el espacio.
    await sacarSiSigueDentro(request, placa);
  }
});
