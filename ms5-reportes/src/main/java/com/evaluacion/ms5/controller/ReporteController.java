package com.evaluacion.ms5.controller;

import com.evaluacion.ms5.model.EventoReporte;
import com.evaluacion.ms5.repository.ReporteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteRepository repo;

    @Autowired
    public ReporteController(ReporteRepository repo) {
        this.repo = repo;
    }

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
    public ResponseEntity<?> recibirEvento(@RequestBody Map<String, Object> payload) {
        String reporteId = (String) payload.get("reporte_id");
        String tipo      = (String) payload.get("tipo");
        String sucursal  = (String) payload.get("sucursal");
        Object monto     = payload.get("monto");

        if (reporteId == null || reporteId.isBlank()
         || tipo == null || tipo.isBlank()
         || sucursal == null || sucursal.isBlank()
         || monto == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Campos obligatorios faltantes",
                                 "requeridos", "reporte_id, tipo, sucursal, monto"));
        }

        long montoVal = ((Number) monto).longValue();
        if (montoVal < 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Monto inválido: debe ser >= 0"));
        }

        EventoReporte e = new EventoReporte(
                null,
                reporteId,
                tipo,
                (String) payload.getOrDefault("descripcion", tipo),
                montoVal,
                sucursal,
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
