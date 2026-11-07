# Casos de prueba manuales — Sistema de Parqueadero

> **Borrador** para el equipo de testing. Antes de empezar, seguir la preparación del
> [plan de pruebas](plan-de-pruebas.md#preparación-antes-de-cada-ronda): base recreada con
> los datos iniciales, backend y frontend encendidos, indicador **Conectado**.
>
> Llenar **Resultado obtenido**, **Estado** (`Aprobado` / `Fallido` / `Bloqueado`) y, si
> falla, el número del issue en **Bug**. Los textos entre comillas son los que debe mostrar
> la pantalla; las placas se muestran con un espacio (KLM234 se ve "KLM 234").

Resumen: RF-01 (8) · RF-02 (6) · RF-03 (5) · RF-04 (5) · RF-05 (8) · RF-06 (6) ·
RF-07 (11) · RNF (8) = **57 casos**.

**Sobre los datos:** los casos que dan cifras exactas (cupos del tablero, cantidad de
parqueos, totales de octubre) suponen la base **recién recreada**. Los casos de cobro van
sacando vehículos y agregando pagos, así que conviene ejecutar en este orden: RF-03,
RF-05-01/02/03/07/08, RF-06, luego el resto. Si una cifra no coincide porque otro caso ya
cambió los datos, recrear la base (`docker compose down -v && docker compose up -d`) antes
de marcarlo como fallido. Para los cobros hace falta un vehículo **con algo que cobrar**:
registrar su entrada y esperar más de un minuto (el primer minuto no se cobra).

---

## RF-01 Registro de carros

| ID | Requisito | Descripción | Precondiciones | Pasos | Resultado esperado | Resultado obtenido | Estado | Bug |
|---|---|---|---|---|---|---|---|---|
| CP-RF01-01 | RF-01 | Registrar un carro nuevo con un propietario nuevo desde la entrada | La placa TST101 y el documento 1100000001 no existen | 1. Ir a **Entrada**.<br>2. Escribir `TST101` y pulsar **Buscar**.<br>3. En Propietario, escribir `1100000001` y pulsar **Buscar propietario**.<br>4. Escribir Nombres `Ana`, Apellidos `Prueba`.<br>5. Pulsar **Registrar vehículo**. | Paso 2: "El vehículo TST 101 no está registrado." y el tipo **Carro** según la placa.<br>Paso 3: "No hay un propietario con el documento 1100000001…".<br>Paso 5: "Vehículo TST 101 registrado." y el Paso 2 muestra los espacios libres para Carro. | | | |
| CP-RF01-02 | RF-01 | Registrar un vehículo de un propietario que ya existe | Placa TST102 nueva | 1. **Entrada** → `TST102` → **Buscar**.<br>2. Documento `1012345678` → **Buscar propietario**.<br>3. **Registrar vehículo**. | Paso 2: "Laura Camila Gómez Rojas ya está registrado como propietario." (no pide nombres).<br>Paso 3: el vehículo queda registrado a nombre de Laura. | | | |
| CP-RF01-03 | RF-01 | No se puede registrar una placa repetida | KLM234 existe | 1. Ir a **Vehículos** → **Nuevo vehículo**.<br>2. Escribir `KLM234`. | Avisa que la placa ya existe y ofrece ver su ficha. No se crea un segundo KLM234. | | | |
| CP-RF01-04 | RF-01 | Formato de placa inválido | — | 1. **Entrada** → escribir `ABC.123` → **Buscar**.<br>2. Repetir con el campo vacío. | 1: "La placa o código solo puede tener letras de la A a la Z y números."<br>2: "El identificador (placa o código) del vehículo es obligatorio."<br>No se consulta ni se registra nada. | | | |
| CP-RF01-05 | RF-01 | La placa se normaliza (mayúsculas, sin guion ni espacios) | KLM234 existe | 1. **Entrada** → escribir `klm-234` → **Buscar**.<br>2. Repetir con `klm 234`. | El campo muestra `KLM234` y encuentra el carro existente (tarjeta con tipo, marca y propietario). No ofrece registrarlo como nuevo. | | | |
| CP-RF01-06 | RF-01 | El tipo sale de la placa | Placas TST12A, R77777 y BICI7777 nuevas | 1. **Entrada** → buscar `TST12A`.<br>2. Buscar `R77777`.<br>3. Buscar `BICI7777`. | "Tipo de vehículo, según la placa": 1 **Moto**, 2 **Camión de carga pesada**, 3 **Bicicleta**. El tipo no se puede cambiar a mano. | | | |
| CP-RF01-07 | RF-01 | Datos obligatorios del registro rápido | Placa TST103 nueva | 1. **Entrada** → `TST103` → **Buscar**.<br>2. Pulsar **Buscar propietario** sin documento.<br>3. Documento nuevo `1100000003` → **Buscar propietario** → **Registrar vehículo** sin nombres. | 2: "El documento del cliente es obligatorio."<br>3: pide los nombres y apellidos; no se registra nada hasta completarlos. | | | |
| CP-RF01-08 | RF-01 | Registrar un vehículo desde la pantalla Vehículos | Placa TST104 nueva | 1. **Vehículos** → **Nuevo vehículo**.<br>2. Placa `TST104`, color `Rojo`, año `2020`, propietario `1012345678`.<br>3. Guardar. | El vehículo aparece en la lista y se abre su ficha con los datos escritos. | | | |

## RF-02 Actualización de la información

| ID | Requisito | Descripción | Precondiciones | Pasos | Resultado esperado | Resultado obtenido | Estado | Bug |
|---|---|---|---|---|---|---|---|---|
| CP-RF02-01 | RF-02 | Editar color, año, marca y modelo de un vehículo | — | 1. **Vehículos** → elegir **KLM 234**.<br>2. **Editar vehículo**.<br>3. Cambiar color a `Azul`, año a `2021` y elegir marca y modelo.<br>4. **Guardar cambios**. | La ficha muestra los datos nuevos. En el formulario, la placa y el tipo se ven pero **no** se pueden editar. | | | |
| CP-RF02-02 | RF-02 | Validaciones al editar un vehículo | — | En **Editar vehículo** de KLM234:<br>1. Año `1800` → Guardar.<br>2. Color de 31 letras → Guardar.<br>3. Elegir una marca sin modelo → Guardar. | 1: "El año del vehículo debe estar entre 1900 y 2100."<br>2: "El color no puede tener más de 30 caracteres."<br>3: "Elige también el modelo o deja la marca vacía."<br>No se guarda nada. | | | |
| CP-RF02-03 | RF-02 | Cambiar el propietario de un vehículo | Documento 1012345678 existe | 1. **Vehículos** → **BCD 567** → **Editar vehículo**.<br>2. Cambiar el propietario al documento `1012345678`.<br>3. **Guardar cambios**. | La ficha de BCD567 muestra como propietaria a Laura Camila Gómez Rojas. | | | |
| CP-RF02-04 | RF-02 | Editar los datos del propietario | — | 1. Ficha de **KLM 234** → **Editar propietario**.<br>2. Cambiar el teléfono a `320 999 9999`.<br>3. **Guardar cambios**. | La ficha muestra el teléfono `3209999999` (sin espacios). Si el propietario tiene varios vehículos, el formulario lo avisa. | | | |
| CP-RF02-05 | RF-02 | Documento repetido al editar un propietario | Otro cliente con documento 1012345678 | En **Editar propietario** de un cliente distinto a Laura, cambiar el documento a `1012345678` → Guardar. | El error sale junto al campo Documento: "Ya existe un cliente con el documento '1012345678'." No se guarda. | | | |
| CP-RF02-06 | RF-02 | Teléfono con letras | — | En **Editar propietario**, teléfono `310-ABC-0000` → Guardar. | "El teléfono solo puede tener números (y un + al inicio)." | | | |

## RF-03 Consulta de carros

| ID | Requisito | Descripción | Precondiciones | Pasos | Resultado esperado | Resultado obtenido | Estado | Bug |
|---|---|---|---|---|---|---|---|---|
| CP-RF03-01 | RF-03 | Buscar por placa exacta | — | **Vehículos** → buscador → `KLM234` → Enter. | Queda un solo resultado y Enter abre su ficha. La URL lleva `?id=`. | | | |
| CP-RF03-02 | RF-03 | Buscar con guion, espacios o minúsculas | — | **Vehículos** → buscar `klm-234`; luego `klm 234`. | En ambos casos aparece **KLM 234**. | | | |
| CP-RF03-03 | RF-03 | Buscar una placa que no existe | ZZZ999 no existe | **Vehículos** → buscar `ZZZ999`. | "Ningún vehículo coincide con "ZZZ999"" y ofrece registrarla. | | | |
| CP-RF03-04 | RF-03 | La ficha muestra toda la información | — | **Vehículos** → abrir **MVC 054**. | Tipo, marca y modelo, color, año, propietario, documento y teléfono. Indica que está dentro y en qué espacio, y enlaza a su historial. | | | |
| CP-RF03-05 | RF-03 | Buscar por documento o por nombre del propietario | — | **Vehículos** → buscar `1012345678`; luego `laura`. | Aparecen los vehículos de Laura Camila Gómez Rojas (la búsqueda por nombre no distingue tildes ni mayúsculas). | | | |

## RF-04 Tiempos de parqueo

| ID | Requisito | Descripción | Precondiciones | Pasos | Resultado esperado | Resultado obtenido | Estado | Bug |
|---|---|---|---|---|---|---|---|---|
| CP-RF04-01 | RF-04 | Tiempo transcurrido de los vehículos dentro | Datos iniciales (4 dentro) | 1. Ir a **Salida** (Vehículos dentro).<br>2. Esperar 1 minuto sin recargar. | Cada vehículo muestra espacio, hora de entrada y "X h Y min dentro". El tiempo aumenta solo cada minuto. | | | |
| CP-RF04-02 | RF-04 | Duración y valor en la liquidación (hora o fracción) | MVC054 dentro | 1. **Salida** → **MVC 054**.<br>2. Revisar la **Cuenta**. | Muestra Entrada, "Si sale ahora", Tiempo dentro y "Valor a pagar" = horas × $ 5.000, con el texto "N h × $ 5.000 la hora (cada hora o fracción)". Ejemplo: 2 h 10 min → 3 h → $ 15.000. | | | |
| CP-RF04-03 | RF-04 | El primer minuto no se cobra | Una placa nueva | 1. Registrar la entrada de un vehículo nuevo.<br>2. Abrir su cobro enseguida.<br>3. Esperar 1 minuto y pulsar **Confirmar pago y salida**. | 2: valor $ 0, sin pedir método de pago.<br>3: "Ya pasó el primer minuto: ahora se cobran $ …. Elige el método de pago." | | | |
| CP-RF04-04 | RF-04 | Parqueo que cruza la medianoche | Ejecutar el SQL **A1** del plan (BCD567 entró ayer a las 23:30) | 1. **Salida** → **BCD 567**.<br>2. Cobrar en efectivo.<br>3. Abrir **Historial** con el rango de ayer a hoy. | 1: la entrada dice la fecha de ayer a las 11:30 p. m. y el tiempo suma las horas de los dos días.<br>3: la fila tiene entrada ayer y salida hoy. En **Reportes**, el ingreso cuenta en el día del pago (hoy). | | | |
| CP-RF04-05 | RF-04 | El recibo muestra los tiempos | Después de cobrar cualquier salida | Revisar el recibo. | Entrada, Salida, Tiempo y Cobro ("N h × $ valor"), con el total. | | | |

## RF-05 Ubicaciones (espacios)

| ID | Requisito | Descripción | Precondiciones | Pasos | Resultado esperado | Resultado obtenido | Estado | Bug |
|---|---|---|---|---|---|---|---|---|
| CP-RF05-01 | RF-05 | Tablero de espacios por piso y zona | Base recién recreada | Abrir el **Tablero**. | 20 espacios en piso 1 (zonas A y M) y piso 2 (B, C y K). Letrero "Todos: 15 libres de 20, 4 ocupados, 1 deshabilitado". Los ocupados muestran la placa y el tiempo. | | | |
| CP-RF05-02 | RF-05 | Disponibilidad por tipo | — | En el letrero, pulsar **Moto**; luego **Camión de carga pesada**. | Solo quedan los espacios de ese tipo con sus cupos ("3 libres de 4"…). La URL guarda el filtro (`?tipo=`). | | | |
| CP-RF05-03 | RF-05 | La entrada solo ofrece espacios libres del tipo del vehículo | ABC12D (moto) afuera | **Entrada** → buscar `ABC12D`. | El Paso 2 solo muestra espacios de moto libres (M-01, M-03, M-04); no aparece M-02 (ocupado) ni espacios de carro. | | | |
| CP-RF05-04 | RF-05 | Del tablero a la entrada con el espacio elegido | A-01 libre | En el **Tablero**, pulsar el espacio **A-01**. | Abre **Entrada** con A-01 ya elegido. Al buscar un carro, A-01 queda marcado; con una moto avisa que el espacio es de otro tipo. | | | |
| CP-RF05-05 | RF-05 | Deshabilitar y volver a habilitar un espacio libre | A-01 libre | 1. **Espacios** → interruptor de **A-01** → confirmar.<br>2. Revisar el tablero y la entrada de un carro.<br>3. Volver a habilitarlo. | 1: el modal pide confirmación; A-01 queda "Deshabilitado".<br>2: no aparece como libre.<br>3: vuelve a estar libre. | | | |
| CP-RF05-06 | RF-05 | Deshabilitar un espacio ocupado | MVC054 en A-02 | 1. **Espacios** → deshabilitar **A-02**.<br>2. Cobrar la salida de MVC054. | 1: el modal avisa que está ocupado por MVC 054 y que el vehículo puede salir.<br>2: la salida se registra normalmente y A-02 queda deshabilitado (no libre). | | | |
| CP-RF05-07 | RF-05 | Un espacio deshabilitado no recibe vehículos | B-04 (piso 2) deshabilitado | En el **Tablero**, pulsar **B-04**. | Un modal avisa que está deshabilitado (se cierra con Escape). No lleva a la entrada. | | | |
| CP-RF05-08 | RF-05 | Ocupación por tipo en los reportes | Base recién recreada | **Reportes** → sección de ocupación. | Por cada tipo, ocupados + libres + deshabilitados = total (Moto 4 = 1+3+0, Bicicleta 2 = 1+1+0, Carro 12 = 2+9+1, Camión 2 = 0+2+0). | | | |

## RF-06 Fechas de parqueo

| ID | Requisito | Descripción | Precondiciones | Pasos | Resultado esperado | Resultado obtenido | Estado | Bug |
|---|---|---|---|---|---|---|---|---|
| CP-RF06-01 | RF-06 | Historial por defecto | Datos iniciales | Abrir **Historial**. | Muestra los parqueos terminados de los últimos 7 días, el más reciente primero, con fecha y hora de entrada y de salida, tiempo, valor, método y referencia. | | | |
| CP-RF06-02 | RF-06 | Filtrar por un rango de fechas | — | **Historial** → Desde `2026-10-01`, Hasta `2026-10-31`. | 15 parqueos, todos con entrada en octubre de 2026. El total de resultados lo dice la pantalla. | | | |
| CP-RF06-03 | RF-06 | Atajos de rango | Base recién recreada | Pulsar **Hoy**, **7 días**, **30 días**, **Este mes** y **Todo**. | Cada atajo cambia las fechas y la lista. **Todo** muestra los 27 parqueos terminados de los datos iniciales (más los que se hayan cobrado en otros casos). | | | |
| CP-RF06-04 | RF-06 | Rango de fechas al revés | — | Desde `2026-10-31`, Hasta `2026-10-01`. | "La fecha 'desde' (31/10/2026) no puede ser posterior a la fecha 'hasta' (01/10/2026)." y no se consulta. | | | |
| CP-RF06-05 | RF-06 | Filtrar por placa y por método | Rango **Todo** | 1. Placa `KLM`.<br>2. Limpiar y elegir método **PSE**. | 1: solo los parqueos de KLM234 (3).<br>2: los parqueos pagados con PSE, aunque sea en parte (6). | | | |
| CP-RF06-06 | RF-06 | La fecha y hora de entrada la pone el servidor | — | Registrar una entrada y revisar el aviso y el **Historial** después de cobrarla. | El resumen dice "La pone el servidor al confirmar". La hora coincide con la hora de Colombia del momento de la entrada. | | | |

## RF-07 Formas de pago

| ID | Requisito | Descripción | Precondiciones | Pasos | Resultado esperado | Resultado obtenido | Estado | Bug |
|---|---|---|---|---|---|---|---|---|
| CP-RF07-01 | RF-07 | Pago con PSE | Un vehículo dentro con cobro (de los datos iniciales o con más de un minuto dentro) | 1. **Salida** → el vehículo.<br>2. Elegir **PSE**, referencia `PSE-PRUEBA-01`.<br>3. **Confirmar pago y salida** → confirmar en el modal. | Modal: "Se cobran $ … con PSE, referencia PSE-PRUEBA-01". Recibo con método PSE, la referencia y el total. | | | |
| CP-RF07-02 | RF-07 | Pago con Nequi | Otro vehículo dentro con cobro | Igual que el anterior con **Nequi** y `NEQ-PRUEBA-01`. | Recibo con Nequi y su referencia. | | | |
| CP-RF07-03 | RF-07 | Pago con Daviplata | Otro vehículo dentro con cobro | Igual con **Daviplata** y `DAV-PRUEBA-01`. | Recibo con Daviplata y su referencia. | | | |
| CP-RF07-04 | RF-07 | Pago en efectivo | Otro vehículo dentro con cobro | 1. Elegir **Nequi** (aparece el campo de referencia).<br>2. Cambiar a **Efectivo**.<br>3. Confirmar. | 2: el campo de referencia desaparece.<br>3: recibo con método Efectivo y **sin** referencia. | | | |
| CP-RF07-05 | RF-07 | La referencia es obligatoria en PSE, Nequi y Daviplata | Un vehículo dentro con cobro | Elegir **PSE** sin referencia → **Confirmar pago y salida**. Repetir con Nequi y Daviplata. | "El pago con PSE requiere la referencia (código de la transacción)." (igual con cada método). No se abre el modal y el vehículo sigue dentro. | | | |
| CP-RF07-06 | RF-07 | Referencia ya usada | NEQ-0001 ya existe | Cobrar con **Nequi** y referencia `NEQ-0001`. | "No se pudo registrar la salida": "Ya existe un pago con la referencia 'NEQ-0001'." El vehículo sigue dentro y el formulario conserva lo escrito. | | | |
| CP-RF07-07 | RF-07 | Cancelar en el modal no cobra | Un vehículo dentro con cobro | Elegir un método → **Confirmar pago y salida** → **Cancelar**. | El modal se cierra, no se registra nada y el vehículo sigue en **Salida**. | | | |
| CP-RF07-08 | RF-07 | Imprimir el recibo | Recibo en pantalla | Pulsar **Imprimir**. | La vista de impresión muestra solo el recibo (sin menú ni botones). | | | |
| CP-RF07-09 | RF-07 | Reporte de ingresos por método y por día | Datos iniciales | **Reportes** → rango del 1 al 5 de octubre de 2026. | Total $ 181.000 en 5 pagos. Por método: PSE $ 145.000, Daviplata $ 26.000, Nequi $ 10.000. Por día: 01-oct $ 130.000, 02-oct $ 6.000, 05-oct $ 45.000. | | | |
| CP-RF07-10 | RF-07 | Un pago nuevo aparece en el reporte de hoy | Haber hecho CP-RF07-01 a 04 | **Reportes** → rango de hoy. | El total de hoy suma los cobros de los casos anteriores, separados por método. | | | |
| CP-RF07-11 | RF-07 | Salida sin cobro | Vehículo con menos de un minuto dentro | Confirmar la salida sin elegir método. | Se registra con valor $ 0 y el recibo dice "Sin cobro" (no crea pago). | | | |

## RNF Requisitos no funcionales

| ID | Requisito | Descripción | Precondiciones | Pasos | Resultado esperado | Resultado obtenido | Estado | Bug |
|---|---|---|---|---|---|---|---|---|
| CP-RNF-01 | RNF | Uso en celular | Herramientas del navegador en modo dispositivo, ancho 375 px | Recorrer Tablero, Entrada, Salida con cobro, Vehículos e Historial. | Todo se puede usar sin desplazamiento horizontal; el menú se abre con su botón; en Vehículos, la ficha tiene "Volver a la lista". | | | |
| CP-RNF-02 | RNF | Navegación con teclado | Sin usar el ratón | Con Tab, Shift+Tab, flechas, Espacio, Enter y Escape: registrar una entrada y cobrar una salida. | Todo es alcanzable y el foco siempre se ve. Las flechas cambian de espacio y de método de pago. Escape cierra los modales. | | | |
| CP-RNF-03 | RNF | Mensajes de error claros | — | Provocar los errores de CP-RF01-04, CP-RF02-05 y CP-RF07-06. | Mensajes en español que dicen qué corregir, sin códigos técnicos, SQL ni nombres como "Exception". | | | |
| CP-RNF-04 | RNF | Backend apagado | Frontend encendido | 1. Apagar el backend (Ctrl+C).<br>2. Navegar por las pantallas.<br>3. Encenderlo y pulsar **Reintentar**. | 1: el indicador cambia a "Sin conexión" en rojo (en máximo 30 s).<br>2: cada pantalla muestra un error con **Reintentar**, sin quedarse en blanco.<br>3: vuelve "Conectado" y los datos cargan. | | | |
| CP-RNF-05 | RNF | MySQL apagado con el backend encendido | — | `docker compose stop`, esperar 30 s y luego `docker compose start`. | El indicador muestra "Sin base de datos" y luego vuelve a "Conectado". | | | |
| CP-RNF-06 | RNF | Dos operarios cobran el mismo vehículo | WZE620 dentro, con cobro | 1. Abrir su cobro en dos pestañas.<br>2. Confirmar el pago en la primera.<br>3. Confirmar en la segunda.<br>4. Ejecutar el SQL **A2** del plan. | 3: la segunda pestaña dice que el parqueo ya está cerrado.<br>4: un solo pago para ese registro. | | | |
| CP-RNF-07 | RNF | Tildes, ñ y emojis | — | Registrar un propietario con nombres `José Ñúñez` y apellidos `Pérez Ávila`. | Se guarda y se ve igual en la ficha, el historial y los recibos. | | | |
| CP-RNF-08 | RNF | Las pantallas cargan sin errores | Consola del navegador abierta (F12) | Abrir cada pantalla del menú y una dirección inexistente (`/xyz`). | Ninguna muestra errores en rojo en la consola. `/xyz` muestra "Página no encontrada" con el enlace **Ir al tablero**. | | | |
