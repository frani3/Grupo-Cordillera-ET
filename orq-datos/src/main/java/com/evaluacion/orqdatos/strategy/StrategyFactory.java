package com.evaluacion.orqdatos.strategy;

import org.springframework.stereotype.Component;
import java.util.Map;

/**
 * FACTORY para estrategias de procesamiento.
 * Centraliza la resolución de qué estrategia usar según el parámetro
 * recibido, manteniendo al controlador desacoplado de las implementaciones.
 */
@Component
public class StrategyFactory {

    private final Map<String, ProcessingStrategy> strategies;

    public StrategyFactory(Map<String, ProcessingStrategy> strategies) {
        this.strategies = strategies;
    }

    /**
     * Retorna la estrategia correspondiente al nombre dado.
     * Si el nombre no existe, retorna BatchStrategy por defecto.
     */
    public ProcessingStrategy getStrategy(String nombre) {
        return strategies.getOrDefault(
                nombre != null ? nombre.toLowerCase() : "batch",
                strategies.get("batch")
        );
    }
}
