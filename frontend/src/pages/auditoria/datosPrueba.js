// Respuestas de GET /auditoria para las pruebas (como las arman los triggers de V008).

export const OPERADORA = {
  idUsuario: 3,
  nombreUsuario: 'ana',
  nombreCompleto: 'Ana Operadora',
  rol: 'OPERADOR',
};

const registro = (idAuditoria, tabla, operacion, datosAntes, datosDespues, quien = OPERADORA) => ({
  idAuditoria,
  fecha: '2026-11-07T10:15:00',
  tabla,
  operacion,
  idFila: idAuditoria * 10,
  ...quien,
  datosAntes,
  datosDespues,
});

export const AUDITORIA = [
  registro(
    5,
    'registro_parqueo',
    'UPDATE',
    { placa: 'KLM234', salida: null, minutos_totales: null, valor_total: null, estado: 'ACTIVO' },
    {
      placa: 'KLM234',
      salida: '2026-11-07 10:15:00',
      minutos_totales: 95,
      valor_total: 10000,
      estado: 'PAGO',
    },
  ),
  registro(4, 'pago', 'INSERT', null, {
    placa: 'KLM234',
    id_registro: 28,
    metodo: 'Efectivo',
    monto: 10000,
    referencia: null,
  }),
  registro(
    3,
    'espacio',
    'UPDATE',
    { espacio: 'B2-04', habilitado: true },
    { espacio: 'B2-04', habilitado: false },
    {
      idUsuario: 2,
      nombreUsuario: 'beto',
      nombreCompleto: 'Beto Administrador',
      rol: 'ADMINISTRADOR',
    },
  ),
  registro(2, 'vehiculo', 'INSERT', null, {
    placa: 'R48213',
    tipo: 'Camión',
    modelo: null,
    propietario: '1012',
    color: 'Blanco',
    anio: null,
  }),
  registro(1, 'registro_parqueo', 'INSERT', null, {
    placa: 'KLM234',
    espacio: 'A1-02',
    entrada: '2026-11-07 08:40:00',
    estado: 'ACTIVO',
  }),
];
