package com.parqueadero.model;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** La jerarquía de roles: cada uno puede todo lo del anterior. */
class RolTest {

    @ParameterizedTest(name = "{0} alcanza {1}: {2}")
    @CsvSource({
        "OPERADOR, OPERADOR, true",
        "OPERADOR, ADMINISTRADOR, false",
        "OPERADOR, DBA, false",
        "ADMINISTRADOR, OPERADOR, true",
        "ADMINISTRADOR, ADMINISTRADOR, true",
        "ADMINISTRADOR, DBA, false",
        "DBA, OPERADOR, true",
        "DBA, ADMINISTRADOR, true",
        "DBA, DBA, true",
    })
    void alcanza(Rol rol, Rol minimo, boolean esperado) {
        assertEquals(esperado, rol.alcanza(minimo));
    }
}
