package com.evaluacion.bff.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class OrqRepClient {

    private final RestTemplate restTemplate;
    private final String orqRepUrl;

    public OrqRepClient(RestTemplate restTemplate,
                        @Value("${orq.rep.url}") String orqRepUrl) {
        this.restTemplate = restTemplate;
        this.orqRepUrl = orqRepUrl;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> fetchReportes(String requestId) {
        try {
            Map<String, Object> resp = restTemplate.getForObject(
                    orqRepUrl + "/api/rep/reportes?id=" + requestId, Map.class);
            return resp != null ? resp : Map.of("error", "sin datos de orq-rep");
        } catch (Exception e) {
            return Map.of("error", "orq-rep no disponible: " + e.getMessage());
        }
    }
}
