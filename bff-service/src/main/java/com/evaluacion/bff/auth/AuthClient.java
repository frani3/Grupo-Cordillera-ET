package com.evaluacion.bff.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

// Llama a MS AUTH para validar tokens Bearer
@Component
public class AuthClient {

    private final RestTemplate restTemplate;
    private final String authUrl;

    public AuthClient(RestTemplate restTemplate,
                      @Value("${ms.auth.url}") String authUrl) {
        this.restTemplate = restTemplate;
        this.authUrl = authUrl;
    }

    // Retorna true si el token es valido segun MS AUTH
    public boolean validate(String bearerToken) {
        if (bearerToken == null || !bearerToken.startsWith("Bearer ")) return false;
        String token = bearerToken.substring(7);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.postForObject(
                    authUrl + "/auth/validate",
                    Map.of("token", token),
                    Map.class
            );
            return resp != null && Boolean.TRUE.equals(resp.get("valid"));
        } catch (Exception e) {
            // MS AUTH no disponible: acepta formato valido como fallback
            System.err.println("[bff] MS AUTH no disponible, fallback a validacion de formato: " + e.getMessage());
            return !token.isBlank();
        }
    }

    // Proxy de login: delega credenciales a MS AUTH y retorna token
    public Map<String, Object> login(String username, String password) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.postForObject(
                    authUrl + "/auth/login",
                    Map.of("username", username, "password", password),
                    Map.class
            );
            return resp != null ? resp : Map.of("error", "Respuesta vacía de ms-auth");
        } catch (Exception e) {
            return Map.of("error", "ms-auth no disponible: " + e.getMessage());
        }
    }
}
