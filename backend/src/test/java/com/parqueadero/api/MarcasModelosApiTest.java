package com.parqueadero.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonElement;
import com.parqueadero.model.Rol;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

/** Agregar marcas y modelos ({@code POST /api/marcas} y {@code /api/modelos}), solo el DBA. */
class MarcasModelosApiTest extends PruebaApi {

    private String tokenDba;

    @BeforeEach
    void iniciarSesionComoDba() {
        tokenDba = tokenConRol(Rol.DBA);
    }

    private static String nombreUnico(String prefijo) {
        return prefijo + " " + Long.toString(System.nanoTime(), 36).toUpperCase();
    }

    private RespuestaHttp crearMarca(String nombre) {
        RespuestaHttp respuesta = enviar("POST", "/marcas", json(Map.of("nombre", nombre)), tokenDba);
        if (respuesta.estado() == 201) {
            registrarMarcaCreada(respuesta.objeto().get("idMarca").getAsLong());
        }
        return respuesta;
    }

    private RespuestaHttp crearModelo(Object idMarca, String nombre) {
        Map<String, Object> datos = new HashMap<>();
        datos.put("idMarca", idMarca);
        datos.put("nombre", nombre);
        RespuestaHttp respuesta = enviar("POST", "/modelos", json(datos), tokenDba);
        if (respuesta.estado() == 201) {
            registrarModeloCreado(respuesta.objeto().get("idModelo").getAsLong());
        }
        return respuesta;
    }

    @Test
    void elDbaAgregaUnaMarcaQueApareceEnElCatalogo() {
        String nombre = nombreUnico("Marca");

        RespuestaHttp respuesta = crearMarca("  " + nombre + " ");

        assertEquals(201, respuesta.estado(), respuesta.cuerpo());
        assertEquals(nombre, respuesta.objeto().get("nombre").getAsString());
        boolean aparece = enviar("GET", "/marcas", null, tokenDba).lista().asList().stream()
                .map(JsonElement::getAsJsonObject)
                .anyMatch(m -> nombre.equals(m.get("nombre").getAsString()));
        assertTrue(aparece);
    }

    @Test
    void unaMarcaRepetidaResponde409AunqueCambienLasMayusculas() {
        String nombre = nombreUnico("Marca");
        crearMarca(nombre);

        RespuestaHttp repetida = crearMarca(nombre.toLowerCase());

        assertEquals(409, repetida.estado(), repetida.cuerpo());
        assertTrue(repetida.objeto().get("mensaje").getAsString().startsWith("Ya existe una marca llamada"));
    }

    @Test
    void unaMarcaSinNombreResponde400() {
        RespuestaHttp respuesta = crearMarca("   ");

        assertEquals(400, respuesta.estado());
        assertEquals("El nombre de la marca es obligatorio.",
                respuesta.objeto().get("mensaje").getAsString());
    }

    @Test
    void elDbaAgregaModelosYLaMarcaNoLosRepite() {
        long idMarca = crearMarca(nombreUnico("Marca")).objeto().get("idMarca").getAsLong();
        long otraMarca = crearMarca(nombreUnico("Otra")).objeto().get("idMarca").getAsLong();

        RespuestaHttp modelo = crearModelo(idMarca, "Modelo X");
        RespuestaHttp repetido = crearModelo(idMarca, "modelo x");
        RespuestaHttp enOtraMarca = crearModelo(otraMarca, "Modelo X");

        assertEquals(201, modelo.estado(), modelo.cuerpo());
        assertEquals(idMarca, modelo.objeto().get("idMarca").getAsLong());
        assertEquals(409, repetido.estado(), repetido.cuerpo());
        assertEquals("Esa marca ya tiene un modelo con ese nombre.",
                repetido.objeto().get("mensaje").getAsString());
        assertEquals(201, enOtraMarca.estado(), "Marcas distintas sí pueden tener el mismo modelo");
        assertEquals(1, enviar("GET", "/modelos?idMarca=" + idMarca, null, tokenDba).lista().size());
    }

    @Test
    void unModeloSinMarcaOConUnaQueNoExisteResponde400() {
        RespuestaHttp sinMarca = crearModelo(null, "Modelo X");
        RespuestaHttp marcaInexistente = crearModelo(999_999_999L, "Modelo X");

        assertEquals(400, sinMarca.estado());
        assertEquals("Elige la marca del modelo.", sinMarca.objeto().get("mensaje").getAsString());
        assertEquals(400, marcaInexistente.estado());
        assertEquals("La marca indicada no existe.",
                marcaInexistente.objeto().get("mensaje").getAsString());
    }
}
