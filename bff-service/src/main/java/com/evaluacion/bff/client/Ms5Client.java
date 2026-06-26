package com.evaluacion.bff.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
public class Ms5Client {

    private final RestTemplate restTemplate;
    private final String ms5Url;

    public Ms5Client(RestTemplate restTemplate, @Value("${ms5.url}") String ms5Url) {
        this.restTemplate = restTemplate;
        this.ms5Url = ms5Url;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> fetchEventos() {
        try {
            List<?> resp = restTemplate.getForObject(ms5Url + "/api/reportes/eventos", List.class);
            return resp != null ? (List<Map<String, Object>>) resp : List.of();
        } catch (Exception e) {
            return List.of(Map.of("error", "ms5-reportes no disponible: " + e.getMessage()));
        }
    }
}
