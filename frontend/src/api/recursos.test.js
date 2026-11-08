import { consultarAuditoria } from './auditoria.js';
import { cerrarSesion, consultarUsuarioActual, iniciarSesion } from './autenticacion.js';
import * as cliente from './cliente.js';
import { consultarIngresos, consultarOcupacion } from './reportes.js';
import {
  crearMarca,
  crearModelo,
  listarMarcas,
  listarMetodosPago,
  listarModelos,
  listarTarifasVigentes,
  listarTiposVehiculo,
} from './catalogos.js';
import { actualizarCliente, crearCliente, listarClientes, obtenerCliente } from './clientes.js';
import { cambiarHabilitadoEspacio, listarEspacios, obtenerEspacio } from './espacios.js';
import {
  consultarLiquidacion,
  listarActivos,
  listarHistorial,
  obtenerRegistro,
  registrarEntrada,
  registrarSalida,
} from './registros.js';
import { consultarSalud } from './salud.js';
import { agregarEspaciosAZona, crearZona, listarZonas } from './zonas.js';
import {
  actualizarUsuario,
  cambiarClaveUsuario,
  crearUsuario,
  listarUsuarios,
} from './usuarios.js';
import {
  actualizarVehiculo,
  crearVehiculo,
  listarVehiculos,
  obtenerVehiculo,
} from './vehiculos.js';

// Se reemplaza el cliente HTTP por funciones simuladas: solo se revisa que cada función de
// recurso llame al método y a la ruta correctos del backend (ver backend/api.http).
vi.mock('./cliente.js', () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }));

const vehiculo = { identificador: 'XYZ987', idTipo: 3, idCliente: 1 };
const propietario = { documento: '1000000001', nombres: 'Ana', apellidos: 'Pérez' };

// [función, cómo se llama, método del cliente, argumentos esperados]
const casos = [
  ['consultarSalud', () => consultarSalud(), 'get', ['/salud']],

  [
    'iniciarSesion',
    () => iniciarSesion('dba', 'clave-123'),
    'post',
    ['/auth/login', { nombreUsuario: 'dba', clave: 'clave-123' }],
  ],
  ['cerrarSesion', () => cerrarSesion(), 'post', ['/auth/logout']],
  ['consultarUsuarioActual', () => consultarUsuarioActual(), 'get', ['/auth/yo']],

  ['listarUsuarios', () => listarUsuarios(), 'get', ['/usuarios']],
  ['listarZonas', () => listarZonas(), 'get', ['/zonas']],
  [
    'consultarAuditoria',
    () => consultarAuditoria({ desde: '2026-11-01', tabla: 'pago' }),
    'get',
    ['/auditoria', { desde: '2026-11-01', hasta: undefined, tabla: 'pago' }],
  ],
  [
    'crearZona',
    () => crearZona({ piso: '3', letra: 'D', idTipo: 1 }),
    'post',
    ['/zonas', { piso: '3', letra: 'D', idTipo: 1 }],
  ],
  [
    'agregarEspaciosAZona',
    () => agregarEspaciosAZona(5, 4),
    'post',
    ['/zonas/5/espacios', { cantidad: 4 }],
  ],
  ['crearMarca', () => crearMarca('Kia'), 'post', ['/marcas', { nombre: 'Kia' }]],
  [
    'crearModelo',
    () => crearModelo(3, 'Picanto'),
    'post',
    ['/modelos', { idMarca: 3, nombre: 'Picanto' }],
  ],
  [
    'crearUsuario',
    () => crearUsuario({ nombreUsuario: 'ana', rol: 'OPERADOR' }),
    'post',
    ['/usuarios', { nombreUsuario: 'ana', rol: 'OPERADOR' }],
  ],
  [
    'actualizarUsuario',
    () => actualizarUsuario(7, { rol: 'DBA' }),
    'put',
    ['/usuarios/7', { rol: 'DBA' }],
  ],
  [
    'cambiarClaveUsuario',
    () => cambiarClaveUsuario(7, 'clave-nueva'),
    'put',
    ['/usuarios/7/clave', { clave: 'clave-nueva' }],
  ],

  [
    'listarVehiculos',
    () => listarVehiculos({ identificador: 'klm-234' }),
    'get',
    ['/vehiculos', { identificador: 'klm-234' }],
  ],
  ['obtenerVehiculo', () => obtenerVehiculo(7), 'get', ['/vehiculos/7']],
  ['crearVehiculo', () => crearVehiculo(vehiculo), 'post', ['/vehiculos', vehiculo]],
  ['actualizarVehiculo', () => actualizarVehiculo(7, vehiculo), 'put', ['/vehiculos/7', vehiculo]],

  [
    'listarClientes',
    () => listarClientes({ documento: '1.012' }),
    'get',
    ['/clientes', { documento: '1.012' }],
  ],
  ['obtenerCliente', () => obtenerCliente(4), 'get', ['/clientes/4']],
  ['crearCliente', () => crearCliente(propietario), 'post', ['/clientes', propietario]],
  [
    'actualizarCliente',
    () => actualizarCliente(4, propietario),
    'put',
    ['/clientes/4', propietario],
  ],

  [
    'listarEspacios',
    () => listarEspacios({ idTipo: 3, disponible: true }),
    'get',
    ['/espacios', { idTipo: 3, disponible: true }],
  ],
  [
    'listarEspacios sin filtros',
    () => listarEspacios(),
    'get',
    ['/espacios', { idTipo: undefined, disponible: undefined }],
  ],
  ['obtenerEspacio', () => obtenerEspacio(16), 'get', ['/espacios/16']],
  [
    'cambiarHabilitadoEspacio',
    () => cambiarHabilitadoEspacio(2, false),
    'patch',
    ['/espacios/2/habilitado', { habilitado: false }],
  ],

  [
    'registrarEntrada',
    () => registrarEntrada({ identificador: 'KLM234', idEspacio: 3 }),
    'post',
    ['/registros/entrada', { identificador: 'KLM234', idEspacio: 3 }],
  ],
  [
    'listarActivos',
    () => listarActivos({ identificador: 'MVC054' }),
    'get',
    ['/registros/activos', { identificador: 'MVC054' }],
  ],
  [
    'listarHistorial',
    () =>
      listarHistorial({
        desde: '2026-10-01',
        hasta: '2026-10-31',
        identificador: 'KLM234',
        idMetodoPago: 1,
      }),
    'get',
    [
      '/registros',
      { desde: '2026-10-01', hasta: '2026-10-31', identificador: 'KLM234', idMetodoPago: 1 },
    ],
  ],
  ['obtenerRegistro', () => obtenerRegistro(28), 'get', ['/registros/28']],
  ['consultarLiquidacion', () => consultarLiquidacion(28), 'get', ['/registros/28/liquidacion']],
  [
    'registrarSalida',
    () => registrarSalida(29, { idMetodoPago: 2, referencia: 'NEQ-1' }),
    'post',
    ['/registros/29/salida', { idMetodoPago: 2, referencia: 'NEQ-1' }],
  ],

  ['listarTiposVehiculo', () => listarTiposVehiculo(), 'get', ['/tipos-vehiculo']],
  ['listarMetodosPago', () => listarMetodosPago(), 'get', ['/metodos-pago']],
  ['listarTarifasVigentes', () => listarTarifasVigentes(), 'get', ['/tarifas/vigente']],
  ['listarMarcas', () => listarMarcas(), 'get', ['/marcas']],
  ['listarModelos', () => listarModelos({ idMarca: 1 }), 'get', ['/modelos', { idMarca: 1 }]],

  [
    'consultarIngresos',
    () => consultarIngresos({ desde: '2026-10-01', hasta: '2026-10-05' }),
    'get',
    ['/reportes/ingresos', { desde: '2026-10-01', hasta: '2026-10-05' }],
  ],
  ['consultarOcupacion', () => consultarOcupacion(), 'get', ['/reportes/ocupacion']],
];

beforeEach(() => {
  vi.clearAllMocks();
});

it.each(casos)('%s llama a la ruta correcta', (nombre, llamar, metodo, argumentos) => {
  llamar();

  expect(cliente[metodo]).toHaveBeenCalledExactlyOnceWith(...argumentos);
});

it('codifica los ids de la ruta', () => {
  obtenerRegistro('1/2');

  expect(cliente.get).toHaveBeenCalledWith('/registros/1%2F2');
});
