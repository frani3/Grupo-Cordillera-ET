package com.evaluacion.msauth.service;

import com.evaluacion.msauth.model.Usuario;
import com.evaluacion.msauth.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    // token -> Usuario (almacenado en memoria durante la sesión)
    private final Map<String, Usuario> tokenStore = new ConcurrentHashMap<>();

    public AuthService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Optional<String> login(String username, String password) {
        String hash = sha256(password);
        return usuarioRepository.findByUsername(username)
                .filter(u -> u.getPasswordHash().equalsIgnoreCase(hash))
                .map(u -> {
                    String token = UUID.randomUUID().toString();
                    tokenStore.put(token, u);
                    System.out.printf("[ms-auth] Login exitoso: %s (%s)%n", username, u.getRole());
                    return token;
                });
    }

    public Optional<Usuario> validate(String token) {
        return Optional.ofNullable(tokenStore.get(token));
    }

    public void logout(String token) {
        tokenStore.remove(token);
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 no disponible", e);
        }
    }
}
