package com.evaluacion.orqdatos.strategy;

import java.util.List;
import java.util.Map;

/**
 * PATRÓN STRATEGY — Define el contrato para las distintas
 * estrategias de procesamiento de datos consolidados.
 * Permite cambiar el algoritmo de procesamiento en tiempo de ejecución
 * sin modificar el contexto (OrqDatosController).
 */
public interface ProcessingStrategy {

    /**
     * Procesa la lista de transacciones y retorna un mapa con
     * los resultados específicos de esta estrategia.
     *
     * @param requestId      identificador de la solicitud
     * @param transacciones  lista cruda de transacciones de MS1+MS2
     * @param totalMonto     suma total de montos ya calculada
     * @return               mapa con campos "estrategia" y "resultado"
     */
    Map<String, Object> procesar(String requestId,
                                  List<Map<String, Object>> transacciones,
                                  double totalMonto);

    /**
     * Nombre de la estrategia (para persistencia y logging).
     */
    String getNombre();
}
