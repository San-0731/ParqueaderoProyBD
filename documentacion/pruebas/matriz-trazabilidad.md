# Matriz de trazabilidad — Sistema de Parqueadero

> **Borrador.** Relaciona cada parte del enunciado con sus casos manuales
> ([`casos-de-prueba.md`](casos-de-prueba.md)) y con las pruebas automáticas que la
> cubren. Sirve para mostrar en la sustentación que **ninguna parte del enunciado quedó
> sin probar**. El equipo de testing agrega aquí los casos nuevos que escriba.

Enunciado:

> **Registro y control** de la información de cada uno de los carros que solicitan
> parqueo, permitir la **actualización** y **consulta** de la información de carros,
> **tiempos de parqueo**, **ubicaciones**, **fechas de parqueo** y **formas de pago**
> (PSE, Nequi, Daviplata o efectivo).

Dónde están las pruebas automáticas:

| Abreviatura | Carpeta | Cómo se ejecutan |
|---|---|---|
| `bd/…` | `backend/src/test/java/com/parqueadero/bd/` (reglas de MySQL) | `mvn verify -Pintegracion` |
| `api/…` | `backend/src/test/java/com/parqueadero/api/` (API contra MySQL real) | `mvn verify -Pintegracion` |
| `service/…`, `util/…` | `backend/src/test/java/com/parqueadero/` (unitarias) | `mvn clean package` |
| `src/…` | `frontend/src/` (Vitest y Testing Library) | `npm test -- --run` |
| `e2e/…` | `frontend/e2e/` (Playwright en un Chromium real) | `npm run test:e2e` |

## 1. Requisitos funcionales

| Parte del enunciado | Req. | Casos manuales | Pruebas automáticas: base de datos y backend | Pruebas automáticas: frontend y E2E |
|---|---|---|---|---|
| **Registro** de la información de cada carro | RF-01 | CP-RF01-01 a 08, CP-RNF-07 | `api/VehiculosApiTest` (crear, tipo según la placa, placa repetida → 409, campos obligatorios → 400) · `api/FlujoParqueoApiTest` (paso 1) · `bd/TriggersTest` (normalizar la placa) · `bd/RestriccionesTest` (identificador duplicado y formato) · `service/VehiculoServiceTest` · `service/ClienteServiceTest` · `util/IdentificadoresTest` · `util/TipoPorPlacaTest` | `src/pages/entrada/Entrada.test.jsx` (registro rápido y propietario) · `src/components/vehiculos/FormularioVehiculo.test.jsx` · `src/components/vehiculos/validaciones.test.js` · `src/utils/identificador.test.js` · `src/utils/tipoVehiculo.test.js` · `src/pages/vehiculos/Vehiculos.test.jsx` ("Nuevo vehículo") · `e2e/flujo-completo.spec.js` |
| **Control** de los carros que solicitan parqueo (entradas y salidas con sus reglas) | RF-01, RF-05, RF-07 | CP-RF01-05, CP-RF05-03, CP-RF05-07, CP-RF07-05, CP-RF07-06, CP-RNF-06 | `bd/RegistrosActivosTest` (un vehículo y un espacio con un solo registro activo) · `bd/TriggersTest` (tipo del espacio, espacio habilitado) · `api/ReglasApiTest` · `api/ConcurrenciaApiTest` (un solo cobro con 10 salidas a la vez) · `service/RegistroServiceTest` · `service/SalidaServiceTest` | `src/pages/entrada/Entrada.test.jsx` (vehículo ya dentro, 409 del backend) · `src/pages/salida/Liquidacion.test.jsx` · `e2e/errores.spec.js` |
| **Actualización** de la información de carros | RF-02 | CP-RF02-01 a 06 | `api/VehiculosApiTest` (crear → consultar → actualizar, no se puede cambiar la placa, actualizar el propietario, documento repetido → 409) · `service/VehiculoServiceTest` (placa y tipo fijos) · `service/ClienteServiceTest` · `bd/RestriccionesTest` (año fuera de rango) · `api/SeguridadApiTest` (textos largos → 400) | `src/pages/vehiculos/Vehiculos.test.jsx` (editar vehículo y propietario) · `src/components/vehiculos/FormularioVehiculo.test.jsx` · `src/components/vehiculos/validaciones.test.js` |
| **Consulta** de la información de carros | RF-03 | CP-RF03-01 a 05 | `api/VehiculosApiTest` (búsqueda con `abc-123` y `abc 123`, id inexistente → 404) · `api/SeguridadApiTest` (inyección SQL en las búsquedas) · `util/RouterTest` | `src/pages/vehiculos/Vehiculos.test.jsx` (buscador, ficha, teclado) · `src/pages/vehiculos/datosVehiculos.test.js` · `src/api/recursos.test.js` · `e2e/navegacion.spec.js` |
| **Tiempos** de parqueo | RF-04 | CP-RF04-01 a 05 | `service/CalculadoraTarifaTest` (hora o fracción, primer minuto sin cobro) · `service/SalidaServiceTest` · `bd/VistasTest` (minutos transcurridos y minutos totales) · `bd/RestriccionesTest` (salida posterior, minutos coherentes) · `api/FlujoParqueoApiTest` (125 min → 3 h) · `util/FechasTest` | `src/pages/salida/Salida.test.jsx` (tiempo dentro) · `src/pages/salida/Liquidacion.test.jsx` (valor, primer minuto, recálculo) · `src/pages/salida/datosSalida.test.js` · `src/utils/formato.test.js` · `e2e/flujo-completo.spec.js` |
| **Ubicaciones** (espacios) | RF-05 | CP-RF05-01 a 08 | `bd/TriggersTest` (tipo del espacio, deshabilitado, mover) · `bd/VistasTest` (espacios disponibles) · `api/ReglasApiTest` (espacio ocupado, deshabilitado, de otro tipo) · `api/FlujoParqueoApiTest` (ocupado y libre otra vez) · `service/EspacioServiceTest` (habilitado obligatorio) | `src/pages/tablero/Tablero.test.jsx` · `src/pages/tablero/datosTablero.test.js` · `src/pages/espacios/Espacios.test.jsx` · `src/pages/entrada/Entrada.test.jsx` (solo espacios del tipo) · `src/utils/espacio.test.js` · `src/pages/reportes/Reportes.test.jsx` (ocupación) · `e2e/flujo-completo.spec.js` (tablero) |
| **Fechas** de parqueo | RF-06 | CP-RF06-01 a 06, CP-RF04-04 | `bd/VistasTest` (historial) · `api/FlujoParqueoApiTest` (historial) · `api/FormatoErroresApiTest` (fecha con otro formato → 400) · `service/RegistroServiceTest` (rango de fechas al revés) · `util/FechasTest` · `util/JsonTest` (fechas ISO-8601) | `src/pages/historial/Historial.test.jsx` (rango por defecto, atajos, rango al revés) · `src/pages/historial/datosHistorial.test.js` · `src/utils/fechas.test.js` · `src/utils/rangosFechas.test.js` · `e2e/flujo-completo.spec.js` (historial) |
| Formas de pago: **PSE** | RF-07 | CP-RF07-01, CP-RF07-05 | `api/FlujoParqueoApiTest` [PSE] · `api/ReglasApiTest` (PSE sin referencia → 400 y el registro sigue abierto) · `service/SalidaServiceTest` (referencia obligatoria y de máximo 60 caracteres) | `src/pages/salida/Liquidacion.test.jsx` (PSE sin referencia no se envía) · `e2e/errores.spec.js` (PSE sin referencia) |
| Formas de pago: **Nequi** | RF-07 | CP-RF07-02, CP-RF07-06 | `api/FlujoParqueoApiTest` [Nequi] · `bd/RestriccionesTest` (referencia repetida) · `bd/VistasTest` (pago dividido Efectivo + Nequi) · `api/SeguridadApiTest` (referencia demasiado larga) | `src/pages/salida/Liquidacion.test.jsx` (pago con Nequi, 409 por referencia) · `e2e/flujo-completo.spec.js` |
| Formas de pago: **Daviplata** | RF-07 | CP-RF07-03 | `api/FlujoParqueoApiTest` [Daviplata] | `src/pages/salida/Liquidacion.test.jsx` (la referencia aparece con los métodos que la piden) |
| Formas de pago: **efectivo** | RF-07 | CP-RF07-04, CP-RF07-11 | `api/FlujoParqueoApiTest` [Efectivo] · `bd/RestriccionesTest` (varios pagos en efectivo sin referencia) · `api/ConcurrenciaApiTest` | `src/pages/salida/Liquidacion.test.jsx` (salida sin cobro) · `e2e/pago-efectivo.spec.js` |
| Pagos: recibo y reportes de ingresos | RF-07 | CP-RF07-07 a 10 | `bd/VistasTest` (ingresos por día y método) · `bd/RestriccionesTest` (monto positivo, tarifa positiva) · `service/ReporteServiceTest` · `api/FlujoParqueoApiTest` (el ingreso aparece en el reporte) | `src/pages/reportes/Reportes.test.jsx` · `src/pages/reportes/datosReportes.test.js` · `src/pages/salida/Liquidacion.test.jsx` (recibo) · `e2e/flujo-completo.spec.js` (recibo) |

## 2. Requisitos no funcionales

| Requisito | Casos manuales | Pruebas automáticas |
|---|---|---|
| Uso en celular | CP-RNF-01 | `src/pages/vehiculos/Vehiculos.test.jsx` ("en celular, la ficha lleva Volver a la lista"). Lo demás se revisa a mano. |
| Teclado y accesibilidad | CP-RNF-02 | `src/accesibilidad.test.jsx` (axe-core en todas las pantallas) · `src/components/ui/Modal.test.jsx` · `src/pages/vehiculos/Vehiculos.test.jsx` (flechas) · `e2e/*` (eligen espacios y métodos con el teclado) |
| Mensajes de error claros, sin detalles internos | CP-RNF-03 | `api/FormatoErroresApiTest` · `api/SeguridadApiTest` (errores de la base traducidos, 500 genérico) · `util/TraductorErroresSQLTest` · `util/RespuestaTest` · `src/api/cliente.test.js` |
| Backend o base de datos apagados | CP-RNF-04, CP-RNF-05 | `api/SeguridadApiTest` (base caída → 500 genérico y salud 503) · `src/components/layout/IndicadorServidor.test.jsx` · `src/hooks/useConsulta.test.jsx` · `src/pages/*/*.test.jsx` ("Reintentar") |
| Concurrencia (dos operarios a la vez) | CP-RNF-06 | `api/ConcurrenciaApiTest` · `bd/RegistrosActivosTest` |
| Tildes, ñ y emojis (UTF-8) | CP-RNF-07 | `api/SeguridadApiTest` (tildes, ñ y emojis de punta a punta) · `bd/TriggersTest` (mensajes con tildes) |
| Seguridad básica | — (automática) | `api/SeguridadApiTest` (inyección SQL, textos largos, cuerpos raros) · revisión de credenciales con `git grep` (Fase 4, Paso D) |
| Las pantallas cargan sin errores | CP-RNF-08 | `e2e/navegacion.spec.js` · `src/App.test.jsx` |

## 3. Comprobación de cobertura

| Parte del enunciado | ¿Casos manuales? | ¿Pruebas automáticas? |
|---|---|---|
| Registro | Sí (9) | Sí |
| Control | Sí (6) | Sí |
| Actualización | Sí (6) | Sí |
| Consulta | Sí (5) | Sí |
| Tiempos de parqueo | Sí (5) | Sí |
| Ubicaciones | Sí (8) | Sí |
| Fechas de parqueo | Sí (7) | Sí |
| Formas de pago: PSE, Nequi, Daviplata y efectivo | Sí (11) | Sí, cada método por separado |

Ninguna parte del enunciado queda sin cubrir.

Pruebas automáticas al preparar este borrador (07/11/2026): **272** de JUnit (157
unitarias y 115 de integración: base de datos, API y seguridad), **411** de Vitest y
**13** de Playwright.
