package com.evaluacion.bff.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class OrqIndClient {

    private final RestTemplate restTemplate;
    private final String orqIndUrl;

    public OrqIndClient(RestTemplate restTemplate,
                        @Value("${orq.ind.url}") String orqIndUrl) {
        this.restTemplate = restTemplate;
        this.orqIndUrl = orqIndUrl;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> fetchIndicadores(String requestId) {
        try {
            Map<String, Object> resp = restTemplate.getForObject(
                    orqIndUrl + "/api/ind/indicadores?id=" + requestId, Map.class);
            return resp != null ? resp : Map.of("error", "sin datos de orq-ind");
        } catch (Exception e) {
            return Map.of("error", "orq-ind no disponible: " + e.getMessage());
        }
    }
}
