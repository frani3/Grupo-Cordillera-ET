package com.evaluacion.orqdatos.strategy;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

/**
 * ESTRATEGIA BATCH: procesa todas las transacciones de una vez.
 * Es la estrategia por defecto para consolidación de datos históricos.
 */
@Component("batch")
public class BatchStrategy implements ProcessingStrategy {

    @Override
    public Map<String, Object> procesar(String requestId,
                                         List<Map<String, Object>> transacciones,
                                         double totalMonto) {
        long pos    = transacciones.stream()
                .filter(t -> "Tienda Física".equals(t.get("canal"))).count();
        long online = transacciones.stream()
                .filter(t -> "Online".equals(t.get("canal"))).count();

        String resultado = "BATCH[%s]: %d transacciones procesadas | POS=%d | Online=%d | total=$%d"
                .formatted(requestId, transacciones.size(), pos, online, (long) totalMonto);

        return Map.of(
                "estrategia",          getNombre(),
                "resultado",           resultado,
                "transaccionesPOS",    pos,
                "transaccionesOnline", online
        );
    }

    @Override
    public String getNombre() { return "batch"; }
}
