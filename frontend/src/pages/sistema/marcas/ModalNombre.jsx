import { useId, useState } from 'react';
import Alerta from '../../../components/ui/Alerta.jsx';
import Boton from '../../../components/ui/Boton.jsx';
import Campo from '../../../components/ui/Campo.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Selector from '../../../components/ui/Selector.jsx';

/**
 * Formulario de un solo nombre: sirve para una marca nueva y para un modelo nuevo (que además
 * pide la marca). Un 409 del backend (nombre repetido) va junto al campo Nombre.
 *
 * @param titulo "Nueva marca" o "Nuevo modelo"
 * @param maximo largo máximo del nombre (el de la columna en la base)
 * @param marcas si viene, se pide la marca (para un modelo): [{ idMarca, nombre }]
 * @param enviar (nombre, idMarca) => promesa con lo creado (la función de src/api/)
 * @param onGuardado recibe lo creado
 */
function ModalNombre({ titulo, textoBoton, maximo, marcas, enviar, onCerrar, onGuardado }) {
  const idFormulario = useId();
  const [nombre, setNombre] = useState('');
  const [idMarca, setIdMarca] = useState('');
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const nuevosErrores = {};
    if (marcas && !idMarca) {
      nuevosErrores.idMarca = 'Elige la marca.';
    }
    if (!nombre.trim()) {
      nuevosErrores.nombre = 'Escribe el nombre.';
    } else if (nombre.trim().length > maximo) {
      nuevosErrores.nombre = `Máximo ${maximo} caracteres.`;
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }
    setGuardando(true);
    setErrorEnvio(null);
    try {
      onGuardado(await enviar(nombre.trim(), marcas ? Number(idMarca) : undefined));
    } catch (error) {
      if (error.estado === 409) {
        setErrores({ nombre: error.mensaje });
      } else {
        setErrorEnvio(error);
      }
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo={titulo}
      onCerrar={() => !guardando && onCerrar()}
      acciones={
        <>
          <Boton variante="secundario" disabled={guardando} onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={idFormulario} cargando={guardando}>
            {textoBoton}
          </Boton>
        </>
      }
    >
      <form id={idFormulario} onSubmit={guardar} noValidate className="flex flex-col gap-4">
        {marcas && (
          <Selector
            etiqueta="Marca"
            placeholder="Elige una marca"
            opciones={marcas.map((marca) => ({ valor: marca.idMarca, texto: marca.nombre }))}
            error={errores.idMarca}
            value={idMarca}
            onChange={(evento) => {
              setIdMarca(evento.target.value);
              setErrores((anteriores) => ({ ...anteriores, idMarca: undefined }));
            }}
          />
        )}
        <Campo
          etiqueta="Nombre"
          error={errores.nombre}
          value={nombre}
          onChange={(evento) => {
            setNombre(evento.target.value);
            setErrores((anteriores) => ({ ...anteriores, nombre: undefined }));
          }}
          maxLength={maximo}
          autoComplete="off"
        />
        {errorEnvio && (
          <Alerta tipo="error" titulo="No se pudo guardar">
            {errorEnvio.mensaje}
          </Alerta>
        )}
      </form>
    </Modal>
  );
}

export default ModalNombre;
