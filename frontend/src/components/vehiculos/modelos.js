// Marca y modelo de un vehículo. El vehículo solo guarda idModelo; la marca se deduce del
// modelo. Lo usan la entrada (vehículo encontrado) y la pantalla de vehículos.

/** Marca y modelo juntos ("Mazda 3"), o null si el vehículo no tiene modelo. */
export function describirModelo(idModelo, modelos, marcas) {
  const modelo = modelos.find((candidato) => candidato.idModelo === idModelo);
  if (!modelo) {
    return null;
  }
  const marca = marcas.find((candidata) => candidata.idMarca === modelo.idMarca);
  return marca ? `${marca.nombre} ${modelo.nombre}` : modelo.nombre;
}

/** Id de la marca de un modelo (para llenar el selector de marca al editar), o null. */
export function idMarcaDeModelo(idModelo, modelos) {
  return modelos.find((modelo) => modelo.idModelo === idModelo)?.idMarca ?? null;
}
