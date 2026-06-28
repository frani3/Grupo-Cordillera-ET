package com.evaluacion.orqdatos.strategy;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

/**
 * ESTRATEGIA STREAM: procesa las transacciones como flujo en tiempo real.
 * Orientada a análisis de tendencias sobre datos frescos.
 */
@Component("stream")
public class StreamStrategy implements ProcessingStrategy {

    @Override
    public Map<String, Object> procesar(String requestId,
                                         List<Map<String, Object>> transacciones,
                                         double totalMonto) {
        double ticketPromedio = transacciones.isEmpty()
                ? 0 : totalMonto / transacciones.size();

        String resultado = "STREAM[%s]: %d transacciones en vivo | ticket_promedio=$%d"
                .formatted(requestId, transacciones.size(), (long) ticketPromedio);

        return Map.of(
                "estrategia",     getNombre(),
                "resultado",      resultado,
                "ticketPromedio", (long) ticketPromedio
        );
    }

    @Override
    public String getNombre() { return "stream"; }
}
