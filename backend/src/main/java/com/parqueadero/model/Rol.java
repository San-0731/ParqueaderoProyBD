package com.parqueadero.model;

/**
 * Rol de un usuario de la aplicación (tabla {@code rol}, V007). Los roles son
 * jerárquicos: cada uno puede hacer todo lo del anterior.
 *
 * <ul>
 *   <li>{@link #OPERADOR}: entradas, salidas y registrar vehículos y clientes
 *       nuevos.</li>
 *   <li>{@link #ADMINISTRADOR}: además edita vehículos y propietarios, habilita
 *       o deshabilita espacios y ve los reportes y la auditoría de los
 *       operadores.</li>
 *   <li>{@link #DBA}: además administra usuarios, zonas, espacios, marcas y
 *       modelos.</li>
 * </ul>
 *
 * <p>El nombre de cada constante es exactamente el de {@code rol.nombre}.
 */
public enum Rol {

    OPERADOR(1, "Operador"),
    ADMINISTRADOR(2, "Administrador"),
    DBA(3, "DBA");

    /** Posición en la jerarquía: a mayor nivel, más permisos. */
    private final int nivel;

    /** Nombre para los mensajes ("Administrador"). */
    private final String nombreVisible;

    Rol(int nivel, String nombreVisible) {
        this.nivel = nivel;
        this.nombreVisible = nombreVisible;
    }

    public String getNombreVisible() {
        return nombreVisible;
    }

    /**
     * Si este rol tiene al menos los permisos de {@code minimo}. Por ejemplo,
     * {@code DBA.alcanza(ADMINISTRADOR)} es {@code true} y
     * {@code OPERADOR.alcanza(ADMINISTRADOR)} es {@code false}.
     */
    public boolean alcanza(Rol minimo) {
        return nivel >= minimo.nivel;
    }
}
