package com.evaluacion.bff.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
public class Ms3Client {

    private final RestTemplate restTemplate;
    private final String ms3Url;

    public Ms3Client(RestTemplate restTemplate, @Value("${ms3.url}") String ms3Url) {
        this.restTemplate = restTemplate;
        this.ms3Url = ms3Url;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> fetchItems() {
        try {
            List<?> resp = restTemplate.getForObject(ms3Url + "/api/inventario/items", List.class);
            return resp != null ? (List<Map<String, Object>>) resp : List.of();
        } catch (Exception e) {
            return List.of(Map.of("error", "ms3-inventario no disponible: " + e.getMessage()));
        }
    }
}
