package com.evaluacion.orqdatos.controller;

import com.evaluacion.orqdatos.model.DatoConsolidado;
import com.evaluacion.orqdatos.repository.DatoConsolidadoRepository;
import com.evaluacion.orqdatos.strategy.ProcessingStrategy;
import com.evaluacion.orqdatos.strategy.StrategyFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// ORQ-DATOS: agrega ventas POS (MS1) + Online (MS2) y persiste snapshot en BD DATOS
@RestController
@RequestMapping("/api")
public class OrqDatosController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final DatoConsolidadoRepository consolidadoRepo;
    private final String ms1Url;
    private final String ms2Url;
    private final StrategyFactory strategyFactory;

    public OrqDatosController(DatoConsolidadoRepository consolidadoRepo,
                              @Value("${data.ms.url}") String ms1Url,
                              @Value("${data.ms2.url}") String ms2Url,
                              StrategyFactory strategyFactory) {
        this.consolidadoRepo  = consolidadoRepo;
        this.ms1Url           = ms1Url;
        this.ms2Url           = ms2Url;
        this.strategyFactory  = strategyFactory;
    }

    // GET /api/datos/consolidado?strategy=batch|stream|cache — compatible con orq-service
    @GetMapping("/datos/consolidado")
    public ResponseEntity<Map<String, Object>> consolidar(
            @RequestParam(defaultValue = "req-1") String id,
            @RequestParam(defaultValue = "batch") String strategy) {

        List<Map<String, Object>> transacciones = fetchTodas();
        double totalMonto = transacciones.stream()
                .mapToDouble(t -> ((Number) t.getOrDefault("montoTotal", 0)).doubleValue())
                .sum();

        // PATRÓN STRATEGY: seleccionar e invocar la estrategia correcta
        ProcessingStrategy processingStrategy = strategyFactory.getStrategy(strategy);
        Map<String, Object> estrategiaResult  = processingStrategy.procesar(id, transacciones, totalMonto);

        String resultado = (String) estrategiaResult.get("resultado");

        // Persistir snapshot en BD DATOS
        consolidadoRepo.save(new DatoConsolidado(
                id, transacciones.size(), totalMonto,
                processingStrategy.getNombre(), resultado));

        // Respuesta base + campos extra de la estrategia
        Map<String, Object> response = new HashMap<>();
        response.put("status",             "ok");
        response.put("requestId",          id);
        response.put("estrategia",         processingStrategy.getNombre());
        response.put("totalTransacciones", transacciones.size());
        response.put("totalMonto",         (long) totalMonto);
        response.put("resultado",          resultado);
        response.put("timestamp",          Instant.now().toString());
        response.putAll(estrategiaResult);

        return ResponseEntity.ok(response);
    }

    // GET /api/datos/ventas — lista cruda de MS1 + MS2 (retrocompatibilidad con orq-service)
    @GetMapping("/datos/ventas")
    public ResponseEntity<List<Map<String, Object>>> ventas() {
        return ResponseEntity.ok(fetchTodas());
    }

    // GET /api/datos/historico — ultimos 10 snapshots de BD DATOS
    @GetMapping("/datos/historico")
    public ResponseEntity<List<DatoConsolidado>> historico() {
        return ResponseEntity.ok(consolidadoRepo.findTop10ByOrderByTimestampDesc());
    }

    // GET /api/datos/health
    @GetMapping("/datos/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "orq-datos",
                "snapshotsGuardados", consolidadoRepo.count(),
                "timestamp", Instant.now().toString()
        ));
    }

    // --- Retrocompatibilidad con rutas del orq-service original ---

    @GetMapping("/data")
    public ResponseEntity<Map<String, Object>> dataLegacy(
            @RequestParam(defaultValue = "default") String id,
            @RequestParam(defaultValue = "batch") String strategy) {
        return consolidar(id, strategy);
    }

    @GetMapping("/ventas")
    public ResponseEntity<List<Map<String, Object>>> ventasLegacy() {
        return ventas();
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthLegacy() {
        return health();
    }

    private List<Map<String, Object>> fetchTodas() {
        CompletableFuture<List<Map<String, Object>>> f1 =
                CompletableFuture.supplyAsync(() -> fetchMs("/api/pos/data", ms1Url, "Tienda Física"));
        CompletableFuture<List<Map<String, Object>>> f2 =
                CompletableFuture.supplyAsync(() -> fetchMs("/api/online/ventas", ms2Url, "Online"));
        return Stream.concat(f1.join().stream(), f2.join().stream()).collect(Collectors.toList());
    }

    private List<Map<String, Object>> fetchMs(String path, String baseUrl, String canal) {
        try {
            ResponseEntity<List<Map<String, Object>>> resp = restTemplate.exchange(
                    baseUrl + path, HttpMethod.GET, null,
                    new ParameterizedTypeReference<>() {});
            List<Map<String, Object>> body = resp.getBody();
            if (body == null) return Collections.emptyList();
            body.forEach(t -> t.put("canal", canal));
            return body;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
