package com.evaluacion.orqind.controller;

import com.evaluacion.orqind.model.IndicadorSnapshot;
import com.evaluacion.orqind.repository.IndicadorRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

// ORQ-IND: agrega indicadores operacionales de MS3 (inventario) y MS4 (empleados)
@RestController
@RequestMapping("/api/ind")
public class OrqIndController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final IndicadorRepository indicadorRepo;
    private final String ms3Url;
    private final String ms4Url;

    public OrqIndController(IndicadorRepository indicadorRepo,
                            @Value("${ms3.url}") String ms3Url,
                            @Value("${ms4.url}") String ms4Url) {
        this.indicadorRepo = indicadorRepo;
        this.ms3Url = ms3Url;
        this.ms4Url = ms4Url;
    }

    // GET /api/ind/indicadores
    @GetMapping("/indicadores")
    public ResponseEntity<Map<String, Object>> indicadores(
            @RequestParam(defaultValue = "ind-1") String id) {

        CompletableFuture<List<Map<String, Object>>> fInventario =
                CompletableFuture.supplyAsync(() -> fetchList(ms3Url + "/api/inventario/items"));
        CompletableFuture<List<Map<String, Object>>> fEmpleados =
                CompletableFuture.supplyAsync(() -> fetchList(ms4Url + "/api/empleados/registros"));

        List<Map<String, Object>> items = fInventario.join();
        List<Map<String, Object>> empleados = fEmpleados.join();

        double totalHoras = empleados.stream()
                .mapToDouble(e -> ((Number) e.getOrDefault("horasTrabajadas", 0)).doubleValue())
                .sum();

        // Persistir en BD IND
        IndicadorSnapshot snap = new IndicadorSnapshot(id, items.size(), empleados.size(), totalHoras);
        indicadorRepo.save(snap);

        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "requestId", id,
                "itemsInventario", items.size(),
                "registrosEmpleados", empleados.size(),
                "totalHorasTrabajadas", totalHoras,
                "snapshotId", snap.getId() != null ? snap.getId() : 0,
                "timestamp", Instant.now().toString()
        ));
    }

    // GET /api/ind/historico — ultimos 10 snapshots de BD IND
    @GetMapping("/historico")
    public ResponseEntity<List<IndicadorSnapshot>> historico() {
        return ResponseEntity.ok(indicadorRepo.findTop10ByOrderByTimestampDesc());
    }

    // GET /api/ind/health
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "orq-ind",
                "snapshotsGuardados", indicadorRepo.count(),
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
