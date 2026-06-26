package com.evaluacion.bff.proxy;

import com.evaluacion.bff.auth.AuthClient;
import com.evaluacion.bff.model.DataResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

// PATRON PROXY:
//   1. Proxy de Proteccion → valida token via MS AUTH antes de propagar.
//   2. Proxy de Auditoria  → registra request/response con timestamp.
//   3. Proxy de Error      → captura excepciones y retorna respuestas tipadas.
@Service
public class ServiceProxy implements IOrqService {

    private final IOrqService realSubject;
    private final AuthClient authClient;

    @Autowired
    public ServiceProxy(
            RestTemplate restTemplate,
            @Value("${orq.service.url}") String serviceUrl,
            AuthClient authClient) {
        this.realSubject = new OrqServiceClient(restTemplate, serviceUrl);
        this.authClient = authClient;
    }

    // Constructor package-private para tests unitarios
    ServiceProxy(IOrqService realSubject, AuthClient authClient) {
        this.realSubject = realSubject;
        this.authClient = authClient;
    }

    @Override
    public DataResponse fetchData(String requestId, String authToken) {
        validateToken(authToken);
        auditLog("REQUEST", requestId, authToken);

        DataResponse response;
        try {
            response = realSubject.fetchData(requestId, authToken);
        } catch (Exception e) {
            auditLog("ERROR", requestId, e.getMessage());
            return DataResponse.error("Error interno del proxy: " + e.getMessage());
        }

        auditLog("RESPONSE", requestId, response.status());
        return response;
    }

    @Override
    public List<Map<String, Object>> fetchVentas(String authToken) {
        validateToken(authToken);
        auditLog("REQUEST", "ventas", authToken);
        try {
            List<Map<String, Object>> ventas = realSubject.fetchVentas(authToken);
            auditLog("RESPONSE", "ventas", ventas.size() + " registros");
            return ventas;
        } catch (Exception e) {
            auditLog("ERROR", "ventas", e.getMessage());
            return Collections.emptyList();
        }
    }

    private void validateToken(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            throw new SecurityException("Token de autorización ausente. Incluir 'Authorization: Bearer <token>'");
        }
        if (!authToken.startsWith("Bearer ")) {
            throw new SecurityException("Formato de token inválido. Se requiere esquema Bearer.");
        }
        if (!authClient.validate(authToken)) {
            throw new SecurityException("Token inválido o expirado. Use POST /auth/login para obtener un token.");
        }
    }

    private void auditLog(String phase, String requestId, String detail) {
        System.out.printf("[AUDIT][%s] phase=%s requestId=%s detail=%s%n",
                Instant.now(), phase, requestId, truncate(detail, 80));
    }

    private String truncate(String value, int max) {
        if (value == null) return "null";
        return value.length() > max ? value.substring(0, max) + "..." : value;
    }
}
