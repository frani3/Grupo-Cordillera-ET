package com.evaluacion.msauth.controller;

import com.evaluacion.msauth.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // POST /auth/login  — body: {"username":"admin","password":"admin123"}
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "");
        String password = body.getOrDefault("password", "");

        return authService.login(username, password)
                .map(token -> ResponseEntity.ok(Map.<String, Object>of(
                        "token", token,
                        "username", username,
                        "timestamp", Instant.now().toString()
                )))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Credenciales inválidas")));
    }

    // POST /auth/validate  — body: {"token":"uuid-here"}  OR header Authorization: Bearer <token>
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validate(
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String token = extractToken(body, authHeader);
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "error", "Token no proporcionado"));
        }

        return authService.validate(token)
                .map(user -> ResponseEntity.ok(Map.<String, Object>of(
                        "valid", true,
                        "username", user.getUsername(),
                        "role", user.getRole()
                )))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("valid", false, "error", "Token inválido o expirado")));
    }

    // GET /auth/health
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "ms-auth",
                "timestamp", Instant.now().toString()
        ));
    }

    private String extractToken(Map<String, String> body, String authHeader) {
        if (body != null && body.containsKey("token")) return body.get("token");
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        return null;
    }
}
