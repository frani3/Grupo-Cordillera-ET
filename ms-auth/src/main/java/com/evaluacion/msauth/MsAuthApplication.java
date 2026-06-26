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

    // Seed inicial de usuarios si la BD está vacía
    @Bean
    CommandLineRunner seedUsers(UsuarioRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                // SHA-256 de "admin123"
                repo.save(new Usuario(null, "admin",
                    "240be518fabd2724ddb6f04eeb1da5967448d7e831d06ce1da3c3e818b4a741a", "ADMIN"));
                // SHA-256 de "user123"
                repo.save(new Usuario(null, "usuario",
                    "57a519a26f6edd7073c2d3e08bab30a23eb19e8f1d671c3fd8c3dbc38e6a6938", "USER"));
                System.out.println("[ms-auth] Usuarios semilla creados: admin/admin123, usuario/user123");
            }
        };
    }
}
