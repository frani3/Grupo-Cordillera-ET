package com.evaluacion.orqrep.controller;

import com.evaluacion.orqrep.model.ReporteSnapshot;
import com.evaluacion.orqrep.repository.ReporteSnapshotRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

// ORQ-REP: agrega eventos financieros de MS5 y persiste resumen en BD REP
@RestController
@RequestMapping("/api/rep")
public class OrqRepController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ReporteSnapshotRepository reporteRepo;
    private final String ms5Url;

    public OrqRepController(ReporteSnapshotRepository reporteRepo,
                            @Value("${ms5.url}") String ms5Url) {
        this.reporteRepo = reporteRepo;
        this.ms5Url = ms5Url;
    }

    // GET /api/rep/reportes
    @GetMapping("/reportes")
    public ResponseEntity<Map<String, Object>> reportes(
            @RequestParam(defaultValue = "rep-1") String id) {

        List<Map<String, Object>> eventos = fetchList(ms5Url + "/api/reportes/eventos");
        double totalMonto = eventos.stream()
                .mapToDouble(e -> ((Number) e.getOrDefault("monto", 0)).doubleValue())
                .sum();

        ReporteSnapshot snap = new ReporteSnapshot(id, eventos.size(), totalMonto);
        reporteRepo.save(snap);

        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "requestId", id,
                "totalEventos", eventos.size(),
                "totalMonto", totalMonto,
                "snapshotId", snap.getId() != null ? snap.getId() : 0,
                "timestamp", Instant.now().toString()
        ));
    }

    // GET /api/rep/historico — ultimos 10 snapshots de BD REP
    @GetMapping("/historico")
    public ResponseEntity<List<ReporteSnapshot>> historico() {
        return ResponseEntity.ok(reporteRepo.findTop10ByOrderByTimestampDesc());
    }

    // GET /api/rep/health
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "orq-rep",
                "snapshotsGuardados", reporteRepo.count(),
                "timestamp", Instant.now().toString()
        ));
    }

    private List<Map<String, Object>> fetchList(String url) {
        try {
            ResponseEntity<List<Map<String, Object>>> resp = restTemplate.exchange(
                    url, HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
            return resp.getBody() != null ? resp.getBody() : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
