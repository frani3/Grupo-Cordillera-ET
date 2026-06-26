package com.evaluacion.bff.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
public class Ms4Client {

    private final RestTemplate restTemplate;
    private final String ms4Url;

    public Ms4Client(RestTemplate restTemplate, @Value("${ms4.url}") String ms4Url) {
        this.restTemplate = restTemplate;
        this.ms4Url = ms4Url;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> fetchRegistros() {
        try {
            List<?> resp = restTemplate.getForObject(ms4Url + "/api/empleados/registros", List.class);
            return resp != null ? (List<Map<String, Object>>) resp : List.of();
        } catch (Exception e) {
            return List.of(Map.of("error", "ms4-empleados no disponible: " + e.getMessage()));
        }
    }
}
