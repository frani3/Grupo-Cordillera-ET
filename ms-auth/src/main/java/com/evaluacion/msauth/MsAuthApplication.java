package com.evaluacion.msauth;

import com.evaluacion.msauth.model.Usuario;
import com.evaluacion.msauth.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MsAuthApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsAuthApplication.class, args);
    }

    @Bean
    CommandLineRunner seedUsers(UsuarioRepository repo) {
        return args -> {
            // SHA-256 correctos (verificados con java.security.MessageDigest UTF-8)
            final String HASH_ADMIN123 = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
            final String HASH_USER123  = "e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446";

            boolean wrongHash = repo.findByUsername("admin")
                    .map(u -> !HASH_ADMIN123.equalsIgnoreCase(u.getPasswordHash()))
                    .orElse(true);

            if (repo.count() == 0 || wrongHash) {
                repo.deleteAll();
                repo.save(new Usuario(null, "admin",   HASH_ADMIN123, "ADMIN"));
                repo.save(new Usuario(null, "usuario", HASH_USER123,  "USER"));
                System.out.println("[ms-auth] Usuarios semilla inicializados: admin/admin123, usuario/user123");
            } else {
                System.out.println("[ms-auth] Usuarios semilla ya existen con hashes correctos.");
            }
        };
    }
}
