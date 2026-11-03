Falta Meter el Modelo Entidad Relacion en imagen
Falta documentacion diccionario de datos de la base de datos
esto se mete cuando las prubeas de la base de datos hayan culminado

NO MODIFICAR NADA DE ACA, SOLO SU PARTE

TESTING DE SANTIAGO SANCHEZ = NO

TESTING DE CALEB GUZMAN = NO

colocar si cuando hayan hecho todos los testings

No se instala dependencia para leer los archivos .env se crea una manera por nuestra cuenta propia

las dependencias que si se van a instalar por el gestor maven seran 
Dependencia	                                       Para qué
MySQL Connector/J (com.mysql:mysql-connector-j)	   El driver JDBC para hablar con MySQL
Gson (com.google.code.gson:gson)	               Convertir objetos Java ↔ JSON
JUnit Jupiter (org.junit.jupiter)	               Pruebas unitarias

---

## Por qué usamos record en el modelo (y no clases comunes)

En `backend/src/main/java/com/parqueadero/model/` hay un `record` por cada
tabla de la base (TipoVehiculo, Tarifa, Marca, Modelo, Cliente, Vehiculo,
Espacio, RegistroParqueo, MetodoPago, Pago) y el enum `EstadoRegistro`.

### Qué es un record

Un `record` (Java 16+) es una clase especial para **guardar datos**. Con una
sola línea, el compilador genera solo:

- un campo `private final` por cada componente,
- el constructor con todos los campos,
- un método para leer cada campo (`nombre()`),
- `equals()`, `hashCode()` y `toString()`.

### Comparación: record vs. clase tradicional

Con record (lo que usamos):

```java
public record Marca(Long idMarca, String nombre) {
}
```

La misma tabla como clase "de toda la vida" (JavaBean):

```java
public class Marca {
    private Long idMarca;
    private String nombre;

    public Marca() {
    }

    public Marca(Long idMarca, String nombre) {
        this.idMarca = idMarca;
        this.nombre = nombre;
    }

    public Long getIdMarca() { return idMarca; }
    public void setIdMarca(Long idMarca) { this.idMarca = idMarca; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Marca otra)) return false;
        return Objects.equals(idMarca, otra.idMarca) && Objects.equals(nombre, otra.nombre);
    }

    @Override
    public int hashCode() { return Objects.hash(idMarca, nombre); }

    @Override
    public String toString() { return "Marca[idMarca=" + idMarca + ", nombre=" + nombre + "]"; }
}
```

Las dos se usan casi igual, pero la clase tiene unas 30 líneas para 2 campos.
`RegistroParqueo` tiene 8 campos: como clase pasaría de 100 líneas que habría
que escribir y mantener a mano (y es fácil olvidar actualizar `equals` al
agregar un campo).

### Por qué nos conviene en este proyecto

1. **Menos código, menos errores.** Cada record cabe en pocas líneas y refleja
   la tabla de un vistazo: es fácil comparar el record con el `CREATE TABLE`.
2. **Inmutables.** No tienen setters: un objeto no cambia después de creado.
   El servidor HTTP atiende varias peticiones al mismo tiempo (en varios
   hilos), y un objeto que no cambia se puede compartir sin riesgo.
3. **No usamos ORM.** Las clases con constructor vacío y setters existen
   sobre todo porque frameworks como JPA/Hibernate las necesitan para llenar
   los objetos solos. Nosotros usamos JDBC puro: el DAO lee el `ResultSet` y
   crea el objeto con todos sus datos de una vez, con el constructor.
4. **Una fila es un dato fijo.** Lo que se lee de la base es una "foto" de la
   fila en ese momento; tiene sentido que no se modifique en memoria.
5. **`equals` compara el contenido.** Dos records con los mismos datos son
   iguales, lo que sirve en las pruebas (`assertEquals(esperado, obtenido)`).
6. **Funcionan con Gson** (desde la versión 2.10) para convertir a JSON y de
   JSON en la API.

### Diferencias a tener en cuenta

- **Los métodos de lectura no llevan `get`:** `vehiculo.idVehiculo()`, no
  `vehiculo.getIdVehiculo()`.
- **No hay setters.** Para "cambiar" un dato se crea otro record con los
  valores nuevos, o el DAO ejecuta directamente el `UPDATE` en la base.
- **No pueden heredar** de otra clase (sí pueden implementar interfaces).
- **No validan nada.** Las reglas de negocio van en la capa `service`, y la
  base de datos tiene además sus `CHECK`.

### Tipos de Java que usamos para cada tipo de SQL

| SQL | Java | Por qué |
|---|---|---|
| `INT UNSIGNED` (llaves y `minutos_totales`) | `Long` | Llega hasta 4.294.967.295, que no cabe en `Integer`. Es el tipo que entrega el driver. |
| `SMALLINT UNSIGNED` (`anio`) | `Integer` | El máximo es 65.535. |
| `DECIMAL(10,2)` | `BigDecimal` | Dinero exacto. Con `double`, `0.1 + 0.2` da `0.30000000000000004`. |
| `DATETIME` | `LocalDateTime` | Fecha y hora sin zona horaria, igual que en MySQL. |
| `DATE` | `LocalDate` | Solo fecha. |
| `BOOLEAN` | `Boolean` | |
| `VARCHAR` | `String` | |
| `estado` (`'ACTIVO'` / `'PAGO'`) | `EstadoRegistro` (enum) | El compilador no deja usar un estado que no existe. |

Todos los campos usan tipos envoltorio (`Long`, `Integer`, `Boolean`) y no
primitivos (`long`, `int`, `boolean`) porque pueden valer `null`: el id antes
de insertar (lo genera `AUTO_INCREMENT`) y las columnas que aceptan `NULL`.

Notas para cuando se hagan los DAO y la API:

- En las columnas que aceptan `NULL`, leer con
  `rs.getObject("id_modelo", Long.class)` y no con `rs.getLong(...)`, porque
  `getLong` devuelve `0` cuando el valor es `NULL`.
- Gson convierte bien los records, pero `LocalDateTime` y `LocalDate` salen
  como un objeto raro (`{"date":{"year":2026,...},"time":{...}}`). Hay que
  agregar en `util` un adaptador para que salgan como texto ISO
  (`"2026-11-02T10:30:00"`).
