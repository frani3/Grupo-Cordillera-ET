package com.evaluacion.ms5.controller;

import com.evaluacion.ms5.model.EventoReporte;
import com.evaluacion.ms5.repository.ReporteRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteRepository repo = ReporteRepository.getInstance();

    private LocalDate parseFecha(Object valor) {
        try {
            if (valor == null) return LocalDate.now();
            String s = valor.toString();
            return LocalDate.parse(s.contains("T") ? s.split("T")[0] : s);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    // POST /api/reportes/evento — Script 5 envia eventos financieros
    @PostMapping("/evento")
    public ResponseEntity<EventoReporte> recibirEvento(@RequestBody Map<String, Object> payload) {
        EventoReporte e = new EventoReporte(
                null,
                (String) payload.getOrDefault("reporte_id", "REP-000"),
                (String) payload.getOrDefault("tipo", "cierre"),
                (String) payload.getOrDefault("descripcion", "evento financiero"),
                ((Number) payload.getOrDefault("monto", 0)).longValue(),
                (String) payload.getOrDefault("sucursal", "central"),
                parseFecha(payload.get("fecha"))
        );
        return ResponseEntity.ok(repo.save(e));
    }

    // GET /api/reportes/eventos
    @GetMapping("/eventos")
    public ResponseEntity<List<EventoReporte>> listarEventos() {
        return ResponseEntity.ok(repo.findAll());
    }

    // GET /api/reportes/health
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "ms5-reportes",
                "eventos", repo.count(),
                "timestamp", Instant.now().toString()
        ));
    }
}
