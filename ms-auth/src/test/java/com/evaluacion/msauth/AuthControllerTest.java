package com.evaluacion.msauth;

import com.evaluacion.msauth.controller.AuthController;
import com.evaluacion.msauth.model.Usuario;
import com.evaluacion.msauth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController controller;

    // authService.login() retorna Optional<String> (solo el token UUID)
    @Test
    void login_credencialesValidas_retornaToken() {
        when(authService.login("admin", "admin123"))
                .thenReturn(Optional.of("uuid-token-123"));

        Map<String, String> credentials = Map.of(
                "username", "admin",
                "password", "admin123"
        );
        ResponseEntity<Map<String, Object>> response = controller.login(credentials);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("uuid-token-123", response.getBody().get("token"));
        assertEquals("admin", response.getBody().get("username"));
    }

    @Test
    void login_credencialesInvalidas_retorna401() {
        when(authService.login("admin", "wrongpass"))
                .thenReturn(Optional.empty());

        Map<String, String> credentials = Map.of(
                "username", "admin",
                "password", "wrongpass"
        );
        ResponseEntity<Map<String, Object>> response = controller.login(credentials);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    // validate() recibe (body, authHeader). authService.validate(token) retorna Optional<Usuario>
    // extractToken: si authHeader empieza con "Bearer ", extrae el token sin el prefijo
    @Test
    void validate_tokenValido_retornaOk() {
        Usuario usuario = new Usuario(1L, "admin", "hash", "ADMIN");
        // extractToken(null, "Bearer valid-token") → "valid-token"
        when(authService.validate("valid-token"))
                .thenReturn(Optional.of(usuario));

        ResponseEntity<Map<String, Object>> response =
                controller.validate(null, "Bearer valid-token");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(true, response.getBody().get("valid"));
        assertEquals("admin", response.getBody().get("username"));
    }

    @Test
    void validate_tokenInvalido_retorna401() {
        // extractToken(null, "Bearer invalid-token") → "invalid-token"
        when(authService.validate("invalid-token"))
                .thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> response =
                controller.validate(null, "Bearer invalid-token");

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(false, response.getBody().get("valid"));
    }

    @Test
    void validate_tokenEnBody_retornaOk() {
        Usuario usuario = new Usuario(1L, "usuario", "hash", "USER");
        // extractToken(body con "token", null) → usa body.get("token")
        when(authService.validate("body-token-456"))
                .thenReturn(Optional.of(usuario));

        Map<String, String> body = Map.of("token", "body-token-456");
        ResponseEntity<Map<String, Object>> response =
                controller.validate(body, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(true, response.getBody().get("valid"));
    }

    @Test
    void validate_sinToken_retorna400() {
        // extractToken(null, null) → null → badRequest
        ResponseEntity<Map<String, Object>> response =
                controller.validate(null, null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(false, response.getBody().get("valid"));
    }

    @Test
    void health_retornaUp() {
        ResponseEntity<Map<String, Object>> response = controller.health();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("ms-auth", response.getBody().get("service"));
    }
}
