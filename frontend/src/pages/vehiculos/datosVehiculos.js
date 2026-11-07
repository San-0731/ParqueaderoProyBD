// Datos de la pantalla de vehículos: la carga, las filas de la lista y el buscador.
// Son funciones sin React, fáciles de probar.

import { listarMarcas, listarModelos, listarTiposVehiculo } from '../../api/catalogos.js';
import { listarClientes } from '../../api/clientes.js';
import { listarActivos } from '../../api/registros.js';
import { listarVehiculos } from '../../api/vehiculos.js';
import { describirModelo } from '../../components/vehiculos/modelos.js';
import { normalizarDocumento } from '../../components/vehiculos/validaciones.js';
import { normalizarIdentificador } from '../../utils/identificador.js';
import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';

/**
 * Todo lo que necesita la pantalla, en paralelo. Son pocos datos (decenas de vehículos), así
 * que se traen completos y se cruzan aquí: el vehículo solo trae ids (tipo, modelo, cliente).
 */
export async function cargarVehiculos() {
  const [vehiculos, clientes, tipos, marcas, modelos, activos] = await Promise.all([
    listarVehiculos(),
    listarClientes(),
    listarTiposVehiculo(),
    listarMarcas(),
    listarModelos(),
    listarActivos(),
  ]);
  return {
    filas: armarFilas({ vehiculos, clientes, tipos, marcas, modelos, activos }),
    marcas,
    modelos,
  };
}

/**
 * Una fila por vehículo, ordenadas por placa:
 * { vehiculo, propietario, tipo, modelo, activo, otrosVehiculos }
 * - tipo: nombre visible ("Camión de carga pesada");
 * - modelo: "Mazda 3", o null si no tiene;
 * - activo: su registro si está dentro del parqueadero, o null;
 * - otrosVehiculos: los demás vehículos del mismo propietario ([{ idVehiculo, identificador }]).
 */
export function armarFilas({ vehiculos, clientes, tipos, marcas, modelos, activos }) {
  const clientePorId = new Map(clientes.map((cliente) => [cliente.idCliente, cliente]));
  const tipoPorId = new Map(tipos.map((tipo) => [tipo.idTipo, tipo.nombre]));
  const activoPorPlaca = new Map(activos.map((activo) => [activo.identificador, activo]));

  return vehiculos
    .map((vehiculo) => ({
      vehiculo,
      propietario: clientePorId.get(vehiculo.idCliente) ?? null,
      tipo: nombreTipoVisible(tipoPorId.get(vehiculo.idTipo) ?? null),
      modelo: describirModelo(vehiculo.idModelo, modelos, marcas),
      activo: activoPorPlaca.get(vehiculo.identificador) ?? null,
      otrosVehiculos: vehiculos
        .filter(
          (otro) =>
            otro.idCliente === vehiculo.idCliente && otro.idVehiculo !== vehiculo.idVehiculo,
        )
        .map(({ idVehiculo, identificador }) => ({ idVehiculo, identificador })),
    }))
    .sort((a, b) => a.vehiculo.identificador.localeCompare(b.vehiculo.identificador));
}

/** "Pérez" → "perez": para buscar nombres sin importar tildes ni mayúsculas. */
export function sinTildes(texto) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Filtra por parte de la placa ("klm" encuentra KLM234), del documento ("1.012" encuentra
 * 1012345678) o del nombre del propietario ("perez" encuentra "Pérez").
 */
export function filtrarFilas(filas, texto) {
  const limpio = (texto ?? '').trim();
  if (limpio === '') {
    return filas;
  }
  const placa = normalizarIdentificador(limpio);
  const documento = normalizarDocumento(limpio);
  const nombre = sinTildes(limpio);

  return filas.filter(({ vehiculo, propietario }) => {
    if (placa && vehiculo.identificador.includes(placa)) {
      return true;
    }
    if (!propietario) {
      return false;
    }
    return (
      (documento !== '' && propietario.documento.includes(documento)) ||
      sinTildes(`${propietario.nombres} ${propietario.apellidos}`).includes(nombre)
    );
  });
}

/** 1 → "1 vehículo"; 15 → "15 vehículos". */
export function contarVehiculos(cantidad) {
  return `${cantidad} ${cantidad === 1 ? 'vehículo' : 'vehículos'}`;
}

/** Nombre completo del propietario, o null si no se encontró. */
export function nombrePropietario(propietario) {
  return propietario ? `${propietario.nombres} ${propietario.apellidos}` : null;
}
