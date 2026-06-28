package com.evaluacion.orqdatos.strategy;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;

/**
 * ESTRATEGIA CACHE: devuelve datos desde la BD DATOS sin re-consultar los MS.
 * En este contexto, trabaja sobre el snapshot ya cargado en memoria
 * y calcula estadísticas de dispersión (máximo y mínimo).
 */
@Component("cache")
public class CacheStrategy implements ProcessingStrategy {

    @Override
    public Map<String, Object> procesar(String requestId,
                                         List<Map<String, Object>> transacciones,
                                         double totalMonto) {
        OptionalDouble max = transacciones.stream()
                .mapToDouble(t -> ((Number) t.getOrDefault("montoTotal", 0)).doubleValue())
                .max();
        OptionalDouble min = transacciones.stream()
                .mapToDouble(t -> ((Number) t.getOrDefault("montoTotal", 0)).doubleValue())
                .min();

        String resultado = "CACHE[%s]: %d registros desde BD DATOS | max=$%d | min=$%d"
                .formatted(requestId, transacciones.size(),
                        (long) max.orElse(0), (long) min.orElse(0));

        return Map.of(
                "estrategia",  getNombre(),
                "resultado",   resultado,
                "montoMaximo", (long) max.orElse(0),
                "montoMinimo", (long) min.orElse(0)
        );
    }

    @Override
    public String getNombre() { return "cache"; }
}
