import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { listarMetodosPago } from '../../api/catalogos.js';
import { ErrorApi } from '../../api/cliente.js';
import {
  consultarLiquidacion,
  listarActivos,
  obtenerRegistro,
  registrarSalida,
} from '../../api/registros.js';
import { formatearPesos } from '../../utils/formato.js';
import Liquidacion from './Liquidacion.jsx';
import {
  ACTIVOS,
  LIQUIDACION_28,
  LIQUIDACION_28_FRESCA,
  LIQUIDACION_SIN_COBRO,
  METODOS,
  REGISTRO_28,
  SALIDA_28_NEQUI,
  SALIDA_28_SIN_COBRO,
} from './datosPrueba.js';

// La API se simula: cada prueba decide qué responde el "backend".
vi.mock('../../api/registros.js', () => ({
  obtenerRegistro: vi.fn(),
  consultarLiquidacion: vi.fn(),
  listarActivos: vi.fn(),
  registrarSalida: vi.fn(),
}));
vi.mock('../../api/catalogos.js', () => ({ listarMetodosPago: vi.fn() }));

function renderizar(ruta = '/salida/28') {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/salida/:idRegistro" element={<Liquidacion />} />
        <Route path="/salida" element={<p>Lista de vehículos dentro</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return usuario;
}

// formatearPesos separa "$" del número con un espacio duro; Testing Library lo convierte en
// un espacio normal al leer la página, así que el texto esperado se normaliza igual.
const pesos = (valor) => formatearPesos(valor).replace(/\s/g, ' ');

const radio = (nombre) => screen.getByRole('radio', { name: nombre });
const campoReferencia = () => screen.queryByRole('textbox', { name: 'Número de referencia' });
const botonPagar = () => screen.getByRole('button', { name: 'Confirmar pago y salida' });
const modal = () => screen.findByRole('dialog', { name: '¿Confirmar el pago y la salida?' });

/** Espera a que la cuenta esté en pantalla (el valor a pagar ya llegó). */
async function esperarCuenta(valor = LIQUIDACION_28.valorTotal) {
  await screen.findByText(pesos(valor));
}

/** Elige Nequi, escribe la referencia y abre la confirmación. */
async function pagarConNequi(usuario, referencia = 'NEQ-1') {
  await usuario.click(radio('Nequi'));
  await usuario.type(campoReferencia(), referencia);
  await usuario.click(botonPagar());
  return modal();
}

describe('Liquidacion (cobro de la salida)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerRegistro.mockResolvedValue(REGISTRO_28);
    consultarLiquidacion.mockResolvedValue(LIQUIDACION_28);
    listarMetodosPago.mockResolvedValue(METODOS);
    listarActivos.mockResolvedValue(ACTIVOS);
    registrarSalida.mockResolvedValue(SALIDA_28_NEQUI);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('muestra la cuenta con el valor que calculó el backend, sin recalcularlo', async () => {
    renderizar();
    await esperarCuenta();

    // 7 h × $ 5.000 serían $ 35.000, pero el backend dijo $ 34.500: se muestra ese.
    expect(screen.queryByText(pesos(35000))).not.toBeInTheDocument();
    expect(screen.getByText(/^7 h × \$\s5\.000 la hora/)).toBeInTheDocument();
    expect(screen.getByText('MVC 054')).toBeInTheDocument();
    expect(screen.getByText('A1-02, piso 1')).toBeInTheDocument();
    expect(screen.getByText('6 h 35 min')).toBeInTheDocument();
    expect(screen.getByText('Carro')).toBeInTheDocument();
    expect(screen.getByText('Laura Camila Pérez')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Cobrar salida' })).toBeInTheDocument();
  });

  it('el campo de referencia aparece solo con los métodos que la piden', async () => {
    const usuario = renderizar();
    await esperarCuenta();
    expect(campoReferencia()).not.toBeInTheDocument();

    await usuario.click(radio('Nequi'));
    expect(campoReferencia()).toBeInTheDocument();
    expect(campoReferencia()).toHaveAccessibleDescription('Código de la transacción en Nequi.');

    await usuario.click(radio('Efectivo'));
    expect(campoReferencia()).not.toBeInTheDocument();

    await usuario.click(radio('PSE'));
    expect(campoReferencia()).toBeInTheDocument();
  });

  it('sin método o con PSE sin referencia no deja enviar ni llama a la API', async () => {
    const usuario = renderizar();
    await esperarCuenta();

    await usuario.click(botonPagar());
    expect(screen.getByText('Elige cómo paga el cliente.')).toBeInTheDocument();

    await usuario.click(radio('PSE'));
    await usuario.click(botonPagar());
    expect(
      screen.getByText('El pago con PSE requiere la referencia (código de la transacción).'),
    ).toBeInTheDocument();
    expect(campoReferencia()).toHaveAttribute('aria-invalid', 'true');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(consultarLiquidacion).toHaveBeenCalledTimes(1); // solo la carga inicial
    expect(registrarSalida).not.toHaveBeenCalled();
  });

  it('pago con Nequi: confirma en el modal, registra la salida y muestra el recibo', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {});
    const usuario = renderizar();
    await esperarCuenta();

    const dialogo = await pagarConNequi(usuario, '  NEQ-1 ');
    expect(dialogo).toHaveTextContent(
      `MVC 054 sale del espacio A1-02, piso 1. Se cobran ${pesos(34500)} con Nequi, referencia NEQ-1.`,
    );
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar pago y salida' }));

    expect(registrarSalida).toHaveBeenCalledWith('28', { idMetodoPago: 2, referencia: 'NEQ-1' });
    const titulo = await screen.findByRole('heading', { name: 'Recibo de salida' });
    expect(titulo).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Salida registrada' }),
    ).toBeInTheDocument();

    const recibo = screen.getByRole('article', { name: 'Recibo de salida' });
    expect(within(recibo).getByText(pesos(34500))).toBeInTheDocument();
    expect(within(recibo).getByText('Nequi')).toBeInTheDocument();
    expect(within(recibo).getByText('NEQ-1')).toBeInTheDocument();
    expect(within(recibo).getByText('6 h 36 min')).toBeInTheDocument();
    expect(within(recibo).getByText(/^7 h × \$\s5\.000$/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(imprimir).toHaveBeenCalledTimes(1);
    await usuario.click(screen.getByRole('link', { name: 'Volver a vehículos dentro' }));
    expect(screen.getByText('Lista de vehículos dentro')).toBeInTheDocument();
  });

  it('el modal muestra el valor recalculado al pulsar "Confirmar pago y salida"', async () => {
    // Entre la carga y la confirmación se cumplió otra hora.
    consultarLiquidacion
      .mockResolvedValueOnce(LIQUIDACION_28)
      .mockResolvedValueOnce({ ...LIQUIDACION_28_FRESCA, horasCobradas: 8, valorTotal: 40000 });
    const usuario = renderizar();
    await esperarCuenta();

    const dialogo = await pagarConNequi(usuario);

    expect(dialogo).toHaveTextContent(`Se cobran ${pesos(40000)} con Nequi`);
    expect(consultarLiquidacion).toHaveBeenCalledTimes(2);
    // La cuenta de fondo también muestra el valor nuevo.
    expect(screen.getAllByText(pesos(40000)).length).toBeGreaterThan(1);
  });

  it('si falla la consulta del valor fresco, no abre el modal, muestra el error y recarga la cuenta', async () => {
    consultarLiquidacion
      .mockResolvedValueOnce(LIQUIDACION_28)
      .mockRejectedValueOnce(
        new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
      );
    const usuario = renderizar();
    await esperarCuenta();

    await usuario.click(radio('Nequi'));
    await usuario.type(campoReferencia(), 'NEQ-1');
    await usuario.click(botonPagar());

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No se pudo conectar con el servidor.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(registrarSalida).not.toHaveBeenCalled();
    // Lo escrito se conserva y la cuenta se vuelve a pedir.
    expect(campoReferencia()).toHaveValue('NEQ-1');
    await waitFor(() => expect(obtenerRegistro).toHaveBeenCalledTimes(2));
  });

  it('mientras se envía, los botones del modal quedan deshabilitados y Escape no lo cierra', async () => {
    registrarSalida.mockReturnValue(new Promise(() => {}));
    const usuario = renderizar();
    await esperarCuenta();

    const dialogo = await pagarConNequi(usuario);
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar pago y salida' });
    await usuario.click(confirmar);

    expect(confirmar).toBeDisabled();
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await usuario.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(registrarSalida).toHaveBeenCalledTimes(1);
  });

  it('"Cancelar" cierra el modal sin registrar nada', async () => {
    const usuario = renderizar();
    await esperarCuenta();

    const dialogo = await pagarConNequi(usuario);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(registrarSalida).not.toHaveBeenCalled();
    expect(radio('Nequi')).toBeChecked();
  });

  it('un 409 al cobrar muestra el mensaje del backend junto al formulario', async () => {
    registrarSalida.mockRejectedValue(
      new ErrorApi(409, 'REGLA_NEGOCIO', "Ya existe un pago con la referencia 'NEQ-1'."),
    );
    const usuario = renderizar();
    await esperarCuenta();

    const dialogo = await pagarConNequi(usuario);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar pago y salida' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No se pudo registrar la salida');
    expect(alerta).toHaveTextContent("Ya existe un pago con la referencia 'NEQ-1'.");
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // El formulario sigue con lo que se había escrito, para corregir la referencia.
    expect(radio('Nequi')).toBeChecked();
    expect(campoReferencia()).toHaveValue('NEQ-1');
    // Y la cuenta se vuelve a consultar.
    await waitFor(() => expect(obtenerRegistro).toHaveBeenCalledTimes(2));
  });

  it('si el parqueo ya estaba cerrado, muestra el mensaje del backend y el enlace para volver', async () => {
    consultarLiquidacion.mockRejectedValue(
      new ErrorApi(
        409,
        'REGLA_NEGOCIO',
        'El parqueo 28 ya está cerrado: la salida se registró el 2026-11-06 18:54:12.',
      ),
    );
    const usuario = renderizar();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No se puede cobrar este parqueo');
    expect(alerta).toHaveTextContent('El parqueo 28 ya está cerrado');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();

    await usuario.click(within(alerta).getByRole('link', { name: 'Volver a vehículos dentro' }));
    expect(screen.getByText('Lista de vehículos dentro')).toBeInTheDocument();
  });

  it('si el registro no existe (404) muestra el mensaje del backend', async () => {
    const noExiste = new ErrorApi(404, 'NO_ENCONTRADO', 'No existe el registro de parqueo 999.');
    obtenerRegistro.mockRejectedValue(noExiste);
    consultarLiquidacion.mockRejectedValue(noExiste);
    renderizar('/salida/999');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No existe el registro de parqueo 999.',
    );
  });

  it('sin conexión ofrece "Reintentar"', async () => {
    obtenerRegistro.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    const usuario = renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la cuenta');
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    await esperarCuenta();
  });

  it('con valor $ 0 no pide método, envía null y el recibo dice "Sin cobro"', async () => {
    consultarLiquidacion.mockResolvedValue(LIQUIDACION_SIN_COBRO);
    registrarSalida.mockResolvedValue(SALIDA_28_SIN_COBRO);
    const usuario = renderizar();
    await screen.findByText('No se cobra: estuvo menos de un minuto.');

    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText('Salida sin cobro')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Confirmar salida sin cobro' }));

    const dialogo = await modal();
    expect(dialogo).toHaveTextContent('No se cobra: estuvo menos de un minuto.');
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Confirmar salida sin cobro' }),
    );

    expect(registrarSalida).toHaveBeenCalledWith('28', { idMetodoPago: null, referencia: null });
    const recibo = await screen.findByRole('article', { name: 'Recibo de salida' });
    expect(recibo).toHaveTextContent('Sin cobro: estuvo menos de un minuto.');
    expect(within(recibo).queryByText('Método de pago')).not.toBeInTheDocument();
  });

  it('si al confirmar ya pasó el primer minuto, pide el método en vez de abrir el modal', async () => {
    consultarLiquidacion.mockResolvedValueOnce(LIQUIDACION_SIN_COBRO).mockResolvedValueOnce({
      ...LIQUIDACION_SIN_COBRO,
      salida: '2026-11-06T12:19:05',
      minutosTotales: 1,
      horasCobradas: 1,
      valorTotal: 5000,
    });
    const usuario = renderizar();
    await screen.findByText('No se cobra: estuvo menos de un minuto.');

    await usuario.click(screen.getByRole('button', { name: 'Confirmar salida sin cobro' }));

    expect(
      await screen.findByText(
        `Ya pasó el primer minuto: ahora se cobran ${pesos(5000)}. Elige el método de pago.`,
      ),
    ).toBeInTheDocument();
    expect(radio('Efectivo')).toBeInTheDocument();
    expect(botonPagar()).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(registrarSalida).not.toHaveBeenCalled();
  });

  it('recalcula la cuenta cada minuto y conserva el método elegido', async () => {
    vi.useFakeTimers();
    renderizar();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(consultarLiquidacion).toHaveBeenCalledTimes(1);
    act(() => radio('Efectivo').click());

    consultarLiquidacion.mockResolvedValue({ ...LIQUIDACION_28_FRESCA, valorTotal: 40000 });
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(consultarLiquidacion).toHaveBeenCalledTimes(2);
    expect(screen.getByText(pesos(40000))).toBeInTheDocument();
    expect(radio('Efectivo')).toBeChecked();
  });
});
